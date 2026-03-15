
-- Table to track completed tasks per volunteer per season per club
CREATE TABLE public.volunteer_season_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  completed_tasks integer NOT NULL DEFAULT 0,
  is_billed boolean NOT NULL DEFAULT false,
  billed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, volunteer_id, season_id)
);

ALTER TABLE public.volunteer_season_usage ENABLE ROW LEVEL SECURITY;

-- Club owners/members can read their club's usage
CREATE POLICY "Club members can view usage"
  ON public.volunteer_season_usage FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

-- System can insert/update (via trigger)
CREATE POLICY "System can manage usage"
  ON public.volunteer_season_usage FOR ALL TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

-- Function to update usage when a volunteer checks in
CREATE OR REPLACE FUNCTION public.update_volunteer_season_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club_id uuid;
  v_season_id uuid;
  v_count integer;
  v_free_limit integer := 2;
  v_price_cents integer;
BEGIN
  -- Only fire when checked_in_at changes from NULL to a value
  IF NEW.checked_in_at IS NOT NULL AND (OLD.checked_in_at IS NULL) THEN
    -- Get club_id from task
    SELECT t.club_id INTO v_club_id FROM public.tasks t WHERE t.id = NEW.task_id;
    IF v_club_id IS NULL THEN RETURN NEW; END IF;

    -- Get active season for this club
    SELECT s.id INTO v_season_id FROM public.seasons s
      WHERE s.club_id = v_club_id AND s.is_active = true LIMIT 1;
    IF v_season_id IS NULL THEN RETURN NEW; END IF;

    -- Upsert usage record
    INSERT INTO public.volunteer_season_usage (club_id, volunteer_id, season_id, completed_tasks)
    VALUES (v_club_id, NEW.volunteer_id, v_season_id, 1)
    ON CONFLICT (club_id, volunteer_id, season_id)
    DO UPDATE SET completed_tasks = volunteer_season_usage.completed_tasks + 1,
                  updated_at = now();

    -- Check if this volunteer now exceeds free limit and needs billing
    SELECT completed_tasks INTO v_count
    FROM public.volunteer_season_usage
    WHERE club_id = v_club_id AND volunteer_id = NEW.volunteer_id AND season_id = v_season_id;

    IF v_count = (v_free_limit + 1) THEN
      -- Mark as billed
      UPDATE public.volunteer_season_usage
      SET is_billed = true, billed_at = now()
      WHERE club_id = v_club_id AND volunteer_id = NEW.volunteer_id AND season_id = v_season_id;

      -- Get price
      SELECT volunteer_price_cents INTO v_price_cents
      FROM public.club_billing WHERE club_id = v_club_id;

      -- Update club billing count
      UPDATE public.club_billing
      SET current_season_volunteers_billed = current_season_volunteers_billed + 1
      WHERE club_id = v_club_id;

      -- Log billing event
      INSERT INTO public.billing_events (club_id, event_type, volunteer_id, season_id, amount_cents)
      VALUES (v_club_id, 'volunteer_billed', NEW.volunteer_id, v_season_id, COALESCE(v_price_cents, 1500));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on task_signups
CREATE TRIGGER trg_update_volunteer_season_usage
  AFTER UPDATE ON public.task_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_volunteer_season_usage();
