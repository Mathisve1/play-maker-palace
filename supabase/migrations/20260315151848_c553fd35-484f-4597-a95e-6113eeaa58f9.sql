
CREATE OR REPLACE FUNCTION public.notify_loyalty_threshold_reached()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_program RECORD;
  v_club_name TEXT;
  v_threshold INTEGER;
  v_current INTEGER;
  v_old_current INTEGER;
BEGIN
  -- Only on update when tasks_completed or points_earned changes
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.reward_claimed THEN RETURN NEW; END IF;

  SELECT lp.*, c.name AS club_name
  INTO v_program
  FROM public.loyalty_programs lp
  JOIN public.clubs c ON c.id = lp.club_id
  WHERE lp.id = NEW.program_id;

  IF v_program IS NULL THEN RETURN NEW; END IF;

  IF v_program.points_based THEN
    v_threshold := COALESCE(v_program.required_points, 0);
    v_current := NEW.points_earned;
    v_old_current := OLD.points_earned;
  ELSE
    v_threshold := v_program.required_tasks;
    v_current := NEW.tasks_completed;
    v_old_current := OLD.tasks_completed;
  END IF;

  -- Only fire when crossing the threshold (old < threshold, new >= threshold)
  IF v_old_current < v_threshold AND v_current >= v_threshold THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.volunteer_id,
      '🎁 Beloning verdiend!',
      'Gefeliciteerd! Je hebt een beloning verdiend bij ' || v_program.club_name || ': ' || v_program.reward_description,
      'loyalty',
      jsonb_build_object('program_id', NEW.program_id, 'enrollment_id', NEW.id, 'action', 'reward_available')
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_loyalty_threshold ON public.loyalty_enrollments;
CREATE TRIGGER trg_loyalty_threshold
  AFTER UPDATE ON public.loyalty_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_loyalty_threshold_reached();
