-- ============================================================
-- Sponsor Portal: QR Redemption + Magic Link Access
-- ============================================================

-- 1. Portal access token on sponsor_campaigns
ALTER TABLE public.sponsor_campaigns
  ADD COLUMN IF NOT EXISTS portal_access_token UUID;

UPDATE public.sponsor_campaigns
   SET portal_access_token = gen_random_uuid()
 WHERE portal_access_token IS NULL;

ALTER TABLE public.sponsor_campaigns
  ALTER COLUMN portal_access_token SET DEFAULT gen_random_uuid();

-- 2. volunteer_coupons — individual coupon instances earned by volunteers
CREATE TABLE IF NOT EXISTS public.volunteer_coupons (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  volunteer_id    UUID        NOT NULL REFERENCES public.profiles(id)          ON DELETE CASCADE,
  task_signup_id  UUID        REFERENCES public.task_signups(id)               ON DELETE SET NULL,
  qr_token        UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  -- 6-char alphanumeric fallback for manual entry at point of sale
  backup_code     TEXT        NOT NULL DEFAULT UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 6)),
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'redeemed', 'expired')),
  redeemed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_coupons_campaign   ON public.volunteer_coupons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_coupons_volunteer  ON public.volunteer_coupons(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_coupons_qr_token   ON public.volunteer_coupons(qr_token);
CREATE INDEX IF NOT EXISTS idx_volunteer_coupons_backup     ON public.volunteer_coupons(backup_code);

ALTER TABLE public.volunteer_coupons ENABLE ROW LEVEL SECURITY;

-- Volunteers can see their own coupons (wallet display)
CREATE POLICY "volunteer_coupons_select_own"
  ON public.volunteer_coupons FOR SELECT
  TO authenticated
  USING (volunteer_id = auth.uid());

-- ── RPCs ─────────────────────────────────────────────────────────────────────

-- 3. Atomic coupon validation + redemption (SECURITY DEFINER, FOR UPDATE prevents race)
CREATE OR REPLACE FUNCTION public.validate_and_redeem_coupon(
  p_code         TEXT,    -- UUID qr_token string OR 6-char backup_code
  p_portal_token UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign  RECORD;
  v_coupon    RECORD;
BEGIN
  -- Validate portal token → find campaign
  SELECT id, title, reward_value_cents, reward_text, status
    INTO v_campaign
    FROM public.sponsor_campaigns
   WHERE portal_access_token = p_portal_token
   LIMIT 1;

  IF v_campaign IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error',   'invalid_portal_token',
      'message', 'Ongeldige portaal-link. Neem contact op met de club.'
    );
  END IF;

  IF v_campaign.status <> 'active' THEN
    RETURN json_build_object(
      'success', false,
      'error',   'campaign_inactive',
      'message', 'Deze campagne is niet meer actief.'
    );
  END IF;

  -- Find coupon by QR token (UUID string) — lock row to prevent race conditions
  BEGIN
    SELECT vc.*
      INTO v_coupon
      FROM public.volunteer_coupons vc
     WHERE vc.qr_token    = p_code::UUID
       AND vc.campaign_id = v_campaign.id
     FOR UPDATE;
  EXCEPTION WHEN invalid_text_representation THEN
    v_coupon := NULL;
  END;

  -- Fallback: try 6-char backup code
  IF v_coupon IS NULL THEN
    SELECT vc.*
      INTO v_coupon
      FROM public.volunteer_coupons vc
     WHERE vc.backup_code = UPPER(TRIM(p_code))
       AND vc.campaign_id = v_campaign.id
     FOR UPDATE;
  END IF;

  IF v_coupon IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error',   'invalid_qr',
      'message', 'QR-code niet herkend. Controleer of dit de juiste coupon is.'
    );
  END IF;

  IF v_coupon.status = 'redeemed' THEN
    RETURN json_build_object(
      'success',     false,
      'error',       'already_redeemed',
      'message',     'Deze coupon werd al ingewisseld.',
      'redeemed_at', v_coupon.redeemed_at
    );
  END IF;

  IF v_coupon.status = 'expired' THEN
    RETURN json_build_object(
      'success', false,
      'error',   'expired',
      'message', 'Deze coupon is verlopen.'
    );
  END IF;

  -- Atomically redeem
  UPDATE public.volunteer_coupons
     SET status      = 'redeemed',
         redeemed_at = now()
   WHERE id = v_coupon.id;

  RETURN json_build_object(
    'success',            true,
    'message',            'Coupon succesvol ingewisseld!',
    'reward_value_cents', v_campaign.reward_value_cents,
    'reward_text',        v_campaign.reward_text,
    'campaign_title',     v_campaign.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_and_redeem_coupon(TEXT, UUID) TO anon, authenticated;

-- 4. Load all portal data in one call (token-gated, no auth session required)
CREATE OR REPLACE FUNCTION public.get_sponsor_portal_data(
  p_campaign_id  UUID,
  p_portal_token UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign  RECORD;
  v_metrics   JSON;
  v_timeline  JSON;
  v_tasks     JSON;
BEGIN
  -- Token gate
  SELECT sc.*, sp.name AS sponsor_name, sp.brand_color, sp.logo_url
    INTO v_campaign
    FROM public.sponsor_campaigns sc
    JOIN public.sponsors sp ON sp.id = sc.sponsor_id
   WHERE sc.id                  = p_campaign_id
     AND sc.portal_access_token = p_portal_token
   LIMIT 1;

  IF v_campaign IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Aggregate metrics
  SELECT json_build_object(
    'total_impressions', COALESCE((
      SELECT SUM(impressions_count)
        FROM public.sponsor_metrics
       WHERE campaign_id = p_campaign_id
    ), 0),
    'total_claims', (
      SELECT COUNT(*) FROM public.volunteer_coupons WHERE campaign_id = p_campaign_id
    ),
    'total_redemptions', (
      SELECT COUNT(*) FROM public.volunteer_coupons
       WHERE campaign_id = p_campaign_id AND status = 'redeemed'
    )
  ) INTO v_metrics;

  -- Redemption timeline: last 30 days (Belgian timezone)
  SELECT COALESCE(json_agg(d ORDER BY d.day), '[]'::json)
    INTO v_timeline
    FROM (
      SELECT
        (DATE(redeemed_at AT TIME ZONE 'Europe/Brussels'))::TEXT AS day,
        COUNT(*)                                                  AS redemptions
        FROM public.volunteer_coupons
       WHERE campaign_id = p_campaign_id
         AND status      = 'redeemed'
         AND redeemed_at >= (now() - INTERVAL '30 days')
       GROUP BY 1
    ) d;

  -- Task attribution: which tasks drove the most redemptions
  SELECT COALESCE(json_agg(ta ORDER BY ta.redemptions DESC NULLS LAST), '[]'::json)
    INTO v_tasks
    FROM (
      SELECT
        t.title     AS task_title,
        t.task_date::TEXT AS task_date,
        COUNT(vc.id) AS redemptions
        FROM public.volunteer_coupons vc
        JOIN public.task_signups ts ON ts.id = vc.task_signup_id
        JOIN public.tasks        t  ON t.id  = ts.task_id
       WHERE vc.campaign_id = p_campaign_id
         AND vc.status      = 'redeemed'
       GROUP BY t.id, t.title, t.task_date
    ) ta;

  RETURN json_build_object(
    'campaign', json_build_object(
      'id',                 v_campaign.id,
      'title',              v_campaign.title,
      'description',        v_campaign.description,
      'rich_description',   v_campaign.rich_description,
      'campaign_type',      v_campaign.campaign_type,
      'reward_value_cents', v_campaign.reward_value_cents,
      'reward_text',        v_campaign.reward_text,
      'custom_cta',         v_campaign.custom_cta,
      'status',             v_campaign.status,
      'start_date',         v_campaign.start_date,
      'end_date',           v_campaign.end_date,
      'sponsor_name',       v_campaign.sponsor_name,
      'brand_color',        v_campaign.brand_color,
      'logo_url',           v_campaign.logo_url,
      'cover_image_url',    v_campaign.cover_image_url
    ),
    'metrics',  COALESCE(v_metrics,  '{}'::json),
    'timeline', COALESCE(v_timeline, '[]'::json),
    'tasks',    COALESCE(v_tasks,    '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_portal_data(UUID, UUID) TO anon, authenticated;
