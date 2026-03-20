-- Migration: Shift Swaps + Reserve Lists
-- Part A of Blue Ocean features: Frictionless shift swapping with priority notification engine

-- ─────────────────────────────────────────────────────────────────────────────
-- reserve_lists: volunteers who opt in to be called for last-minute slots
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reserve_lists (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id       UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id      UUID        REFERENCES public.events(id) ON DELETE CASCADE,
  event_date    DATE,
  task_type     TEXT,       -- optional filter: 'steward', 'bar', etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A volunteer can be on reserve for a club globally OR for a specific event/date
  UNIQUE(user_id, club_id, COALESCE(event_id::TEXT, ''), COALESCE(event_date::TEXT, ''))
);

ALTER TABLE public.reserve_lists ENABLE ROW LEVEL SECURITY;

-- Volunteer can manage their own reserve entries
CREATE POLICY "reserve_select_own" ON public.reserve_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reserve_insert_own" ON public.reserve_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reserve_delete_own" ON public.reserve_lists
  FOR DELETE USING (auth.uid() = user_id);

-- Club members can see who is on reserve for their club
CREATE POLICY "reserve_select_club_member" ON public.reserve_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.club_id = reserve_lists.club_id
        AND cm.volunteer_id = auth.uid()
        AND cm.status = 'actief'
    )
  );

CREATE INDEX IF NOT EXISTS idx_reserve_lists_club ON public.reserve_lists(club_id);
CREATE INDEX IF NOT EXISTS idx_reserve_lists_user ON public.reserve_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_reserve_lists_event ON public.reserve_lists(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reserve_lists_date  ON public.reserve_lists(event_date) WHERE event_date IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- shift_swaps: tracks when a volunteer needs a replacement
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  original_user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  replacement_user_id UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason              TEXT        NOT NULL CHECK (reason IN (
                                    'ziekte', 'familie', 'werk_studie',
                                    'vervoer', 'agenda', 'anders'
                                  )),
  status              TEXT        NOT NULL DEFAULT 'searching'
                                  CHECK (status IN ('searching', 'resolved', 'cancelled', 'expired')),
  notified_at         TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;

-- Original user and replacement can see their own swaps; club members can see swaps for their tasks
CREATE POLICY "swaps_select" ON public.shift_swaps
  FOR SELECT USING (
    auth.uid() = original_user_id
    OR auth.uid() = replacement_user_id
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.club_memberships cm
        ON cm.club_id = t.club_id
        AND cm.volunteer_id = auth.uid()
        AND cm.status = 'actief'
      WHERE t.id = shift_swaps.task_id
    )
  );

-- Only the original user can open a swap request
CREATE POLICY "swaps_insert" ON public.shift_swaps
  FOR INSERT WITH CHECK (auth.uid() = original_user_id);

-- Original user can cancel their own searching swap
CREATE POLICY "swaps_update_cancel" ON public.shift_swaps
  FOR UPDATE USING (
    auth.uid() = original_user_id
    AND status = 'searching'
  );

-- Edge functions (service role) handle resolution — no additional RLS needed for that path

CREATE INDEX IF NOT EXISTS idx_shift_swaps_task_id      ON public.shift_swaps(task_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_original_user ON public.shift_swaps(original_user_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_status        ON public.shift_swaps(status) WHERE status = 'searching';
