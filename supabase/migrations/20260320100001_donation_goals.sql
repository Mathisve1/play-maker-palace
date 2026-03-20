-- Migration: donation_goals + donation_transactions
-- Volunteer micro-sponsoring system

-- ── Donation Goals (club-managed) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.donation_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  target_amount INTEGER NOT NULL CHECK (target_amount > 0), -- in cents
  raised_amount INTEGER NOT NULL DEFAULT 0 CHECK (raised_amount >= 0),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_donation_goals_updated_at
  BEFORE UPDATE ON public.donation_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.donation_goals ENABLE ROW LEVEL SECURITY;

-- Club owners/admins can manage goals
CREATE POLICY "donation_goals_club_manage" ON public.donation_goals
  FOR ALL USING (
    public.is_club_member(auth.uid(), club_id)
  );

-- Volunteers can view active goals for their clubs
CREATE POLICY "donation_goals_volunteer_view" ON public.donation_goals
  FOR SELECT USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.club_id = donation_goals.club_id
        AND cm.volunteer_id = auth.uid()
        AND cm.status = 'actief'
    )
  );

-- ── Donation Transactions (INSERT-ONLY ledger) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.donation_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_goal_id UUID NOT NULL REFERENCES public.donation_goals(id) ON DELETE RESTRICT,
  volunteer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  task_id          UUID NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  amount           INTEGER NOT NULL CHECK (amount > 0), -- in cents
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each (volunteer, task) can only be donated once
  CONSTRAINT donation_transactions_unique UNIQUE (volunteer_id, task_id)
);

ALTER TABLE public.donation_transactions ENABLE ROW LEVEL SECURITY;

-- Only INSERT allowed — no UPDATE or DELETE (immutable ledger)
CREATE POLICY "donation_transactions_insert" ON public.donation_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = volunteer_id
  );

-- Both volunteer and club members can see transactions
CREATE POLICY "donation_transactions_select" ON public.donation_transactions
  FOR SELECT USING (
    auth.uid() = volunteer_id
    OR EXISTS (
      SELECT 1 FROM public.donation_goals dg
      JOIN public.club_memberships cm ON cm.club_id = dg.club_id
      WHERE dg.id = donation_transactions.donation_goal_id
        AND cm.volunteer_id = auth.uid()
        AND cm.status = 'actief'
    )
  );

-- ── Trigger: increment raised_amount atomically on donation ───────────────────

CREATE OR REPLACE FUNCTION public.increment_donation_goal_raised()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.donation_goals
  SET raised_amount = raised_amount + NEW.amount,
      updated_at    = NOW()
  WHERE id = NEW.donation_goal_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_donation_goal
  AFTER INSERT ON public.donation_transactions
  FOR EACH ROW EXECUTE FUNCTION public.increment_donation_goal_raised();
