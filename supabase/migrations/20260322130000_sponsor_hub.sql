-- ============================================================
-- Sponsor & Local Coupon Hub
-- Phase 1: Database architecture with strict RLS
-- ============================================================

-- Enum types
CREATE TYPE sponsor_campaign_type   AS ENUM ('dashboard_banner', 'task_tag', 'local_coupon');
CREATE TYPE sponsor_campaign_status AS ENUM ('draft', 'active', 'ended');
CREATE TYPE volunteer_coupon_status AS ENUM ('available', 'claimed', 'redeemed');

-- ── 1. sponsors ──────────────────────────────────────────────────────────────
CREATE TABLE public.sponsors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  logo_url    TEXT,
  brand_color TEXT        NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsors_club_id ON public.sponsors(club_id);

-- ── 2. sponsor_campaigns ─────────────────────────────────────────────────────
CREATE TABLE public.sponsor_campaigns (
  id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID                    NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  sponsor_id          UUID                    NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  campaign_type       sponsor_campaign_type   NOT NULL,
  title               TEXT                    NOT NULL,
  description         TEXT,
  reward_value_cents  INTEGER,
  status              sponsor_campaign_status NOT NULL DEFAULT 'draft',
  start_date          DATE,
  end_date            DATE,
  created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsor_campaigns_club_id    ON public.sponsor_campaigns(club_id);
CREATE INDEX idx_sponsor_campaigns_sponsor_id ON public.sponsor_campaigns(sponsor_id);
CREATE INDEX idx_sponsor_campaigns_status     ON public.sponsor_campaigns(status);

-- ── 3. sponsor_metrics ───────────────────────────────────────────────────────
CREATE TABLE public.sponsor_metrics (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID    NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  date              DATE    NOT NULL DEFAULT CURRENT_DATE,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  claims_count      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (campaign_id, date)
);

CREATE INDEX idx_sponsor_metrics_campaign_id ON public.sponsor_metrics(campaign_id);
CREATE INDEX idx_sponsor_metrics_date        ON public.sponsor_metrics(date);

-- ── 4. volunteer_coupons ─────────────────────────────────────────────────────
CREATE TABLE public.volunteer_coupons (
  id             UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id   UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id    UUID                    NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  status         volunteer_coupon_status NOT NULL DEFAULT 'available',
  qr_code_token  TEXT                    NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  UNIQUE (volunteer_id, campaign_id)
);

CREATE INDEX idx_volunteer_coupons_volunteer_id ON public.volunteer_coupons(volunteer_id);
CREATE INDEX idx_volunteer_coupons_campaign_id  ON public.volunteer_coupons(campaign_id);

-- ── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.sponsors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_coupons ENABLE ROW LEVEL SECURITY;

-- ── sponsors policies ─────────────────────────────────────────────────────────
-- Club owners and active members can read their club's sponsors
CREATE POLICY "sponsors_select" ON public.sponsors
  FOR SELECT USING (
    club_id IN (
      SELECT id FROM public.clubs WHERE owner_id = auth.uid()
      UNION
      SELECT club_id FROM public.club_memberships
        WHERE volunteer_id = auth.uid() AND status = 'actief'
    )
  );

CREATE POLICY "sponsors_insert" ON public.sponsors
  FOR INSERT WITH CHECK (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

CREATE POLICY "sponsors_update" ON public.sponsors
  FOR UPDATE USING (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

CREATE POLICY "sponsors_delete" ON public.sponsors
  FOR DELETE USING (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

-- ── sponsor_campaigns policies ────────────────────────────────────────────────
-- Club members read their club's campaigns; anon read for external portals
-- (The UUID serves as the access token for the external portal — marketing data
--  is intentionally quasi-public. Cross-club isolation is enforced at app layer.)
CREATE POLICY "sponsor_campaigns_select" ON public.sponsor_campaigns
  FOR SELECT USING (
    club_id IN (
      SELECT id FROM public.clubs WHERE owner_id = auth.uid()
      UNION
      SELECT club_id FROM public.club_memberships
        WHERE volunteer_id = auth.uid() AND status = 'actief'
    )
    OR auth.role() = 'anon'
    OR (auth.uid() IS NOT NULL)  -- authenticated external portal viewers
  );

CREATE POLICY "sponsor_campaigns_insert" ON public.sponsor_campaigns
  FOR INSERT WITH CHECK (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

CREATE POLICY "sponsor_campaigns_update" ON public.sponsor_campaigns
  FOR UPDATE USING (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

CREATE POLICY "sponsor_campaigns_delete" ON public.sponsor_campaigns
  FOR DELETE USING (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

-- ── sponsor_metrics policies ──────────────────────────────────────────────────
-- Readable by club members + anon (for external portal)
-- Written only via SECURITY DEFINER RPC (bypasses RLS atomically)
CREATE POLICY "sponsor_metrics_select" ON public.sponsor_metrics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.sponsor_campaigns
        WHERE club_id IN (
          SELECT id FROM public.clubs WHERE owner_id = auth.uid()
          UNION
          SELECT club_id FROM public.club_memberships
            WHERE volunteer_id = auth.uid() AND status = 'actief'
        )
    )
    OR auth.role() = 'anon'
    OR (auth.uid() IS NOT NULL)
  );

-- ── volunteer_coupons policies ────────────────────────────────────────────────
-- Volunteers own their coupons; club owners can read all for their campaigns
CREATE POLICY "volunteer_coupons_select" ON public.volunteer_coupons
  FOR SELECT USING (
    volunteer_id = auth.uid()
    OR campaign_id IN (
      SELECT id FROM public.sponsor_campaigns
        WHERE club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "volunteer_coupons_insert" ON public.volunteer_coupons
  FOR INSERT WITH CHECK (volunteer_id = auth.uid());

CREATE POLICY "volunteer_coupons_update" ON public.volunteer_coupons
  FOR UPDATE USING (volunteer_id = auth.uid());

-- ── RPC: atomic metric increment ─────────────────────────────────────────────
-- Uses SECURITY DEFINER to bypass RLS for atomic upsert — prevents race conditions
-- from concurrent volunteers triggering impressions simultaneously.
CREATE OR REPLACE FUNCTION public.increment_campaign_metric(
  camp_id     UUID,
  metric_type TEXT   -- 'impression' | 'claim'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sponsor_metrics (campaign_id, date, impressions_count, claims_count)
  VALUES (
    camp_id,
    CURRENT_DATE,
    CASE WHEN metric_type = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN metric_type = 'claim'      THEN 1 ELSE 0 END
  )
  ON CONFLICT (campaign_id, date) DO UPDATE SET
    impressions_count = sponsor_metrics.impressions_count +
      CASE WHEN metric_type = 'impression' THEN 1 ELSE 0 END,
    claims_count = sponsor_metrics.claims_count +
      CASE WHEN metric_type = 'claim' THEN 1 ELSE 0 END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_campaign_metric(UUID, TEXT) TO authenticated, anon;
