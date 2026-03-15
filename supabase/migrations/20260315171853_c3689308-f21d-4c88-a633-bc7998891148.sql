
-- Table for onboarding email sequence
CREATE TABLE public.club_onboarding_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  email_step INTEGER NOT NULL CHECK (email_step IN (1, 2, 3)),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, email_step)
);

ALTER TABLE public.club_onboarding_emails ENABLE ROW LEVEL SECURITY;

-- Only service role / internal use — no public RLS policies needed
CREATE POLICY "Service role full access" ON public.club_onboarding_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger: auto-insert 3 onboarding emails when a new club is created
CREATE OR REPLACE FUNCTION public.schedule_club_onboarding_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.club_onboarding_emails (club_id, email_step, scheduled_for)
  VALUES
    (NEW.id, 1, now()),
    (NEW.id, 2, now() + INTERVAL '3 days'),
    (NEW.id, 3, now() + INTERVAL '7 days');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_club_onboarding_emails
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_club_onboarding_emails();
