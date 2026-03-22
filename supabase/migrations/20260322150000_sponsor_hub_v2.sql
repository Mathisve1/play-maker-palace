-- ============================================================
-- Sponsor Hub v2: image_url + campaign-task linking
-- ============================================================

-- Add image URL to campaigns (for custom ad creative)
ALTER TABLE public.sponsor_campaigns
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── sponsor_campaign_tasks (join table) ───────────────────────────────────────
-- Links a local_coupon campaign to specific tasks.
-- When a volunteer completes one of these tasks, the coupon unlocks in their wallet.
CREATE TABLE IF NOT EXISTS public.sponsor_campaign_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  task_id     UUID        NOT NULL REFERENCES public.tasks(id)             ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_sct_campaign_id ON public.sponsor_campaign_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sct_task_id     ON public.sponsor_campaign_tasks(task_id);

ALTER TABLE public.sponsor_campaign_tasks ENABLE ROW LEVEL SECURITY;

-- Public read: TaskDetail needs this without auth to show the reward badge
-- to volunteers browsing tasks (anon + authenticated)
CREATE POLICY "sct_select" ON public.sponsor_campaign_tasks
  FOR SELECT USING (true);

-- Only the club owner who owns the linked campaign can insert
CREATE POLICY "sct_insert" ON public.sponsor_campaign_tasks
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.sponsor_campaigns
        WHERE club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
    )
  );

-- Only the club owner can delete
CREATE POLICY "sct_delete" ON public.sponsor_campaign_tasks
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM public.sponsor_campaigns
        WHERE club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
    )
  );
