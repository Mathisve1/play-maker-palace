
CREATE OR REPLACE FUNCTION public.notify_on_task_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_vol_name TEXT;
  v_club_owner_id UUID;
  v_is_urgent BOOLEAN := false;
  v_notif_type TEXT := 'task';
  v_title TEXT;
  v_message TEXT;
  v_zone_name TEXT := NULL;
BEGIN
  -- Get task details
  SELECT t.title, t.task_date, t.club_id, c.owner_id
  INTO v_task
  FROM public.tasks t
  JOIN public.clubs c ON c.id = t.club_id
  WHERE t.id = NEW.task_id;

  -- Get volunteer name
  SELECT COALESCE(full_name, email, 'Vrijwilliger') INTO v_vol_name
  FROM public.profiles WHERE id = NEW.volunteer_id;

  IF v_task IS NULL THEN RETURN NEW; END IF;

  -- CASE 1: New signup (status = 'pending' or 'assigned')
  IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'assigned') THEN
    v_title := 'Nieuwe inschrijving';
    v_message := v_vol_name || ' heeft zich ingeschreven voor ' || v_task.title;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (v_task.owner_id, v_title, v_message, v_notif_type, 
      jsonb_build_object('task_id', NEW.task_id, 'volunteer_id', NEW.volunteer_id, 'action', 'signup'));
  END IF;

  -- CASE 2: Cancellation (status changed to 'cancelled')
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Check if within 48h of task
    IF v_task.task_date IS NOT NULL AND v_task.task_date::timestamptz - NOW() < INTERVAL '48 hours' THEN
      v_is_urgent := true;
    END IF;

    v_title := CASE WHEN v_is_urgent THEN '⚠️ Afmelding' ELSE 'Afmelding' END;
    v_message := v_vol_name || ' heeft zich afgemeld voor ' || v_task.title
      || CASE WHEN v_task.task_date IS NOT NULL THEN ' op ' || to_char(v_task.task_date::timestamptz, 'DD/MM/YYYY') ELSE '' END;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (v_task.owner_id, v_title, v_message,
      CASE WHEN v_is_urgent THEN 'urgent' ELSE v_notif_type END,
      jsonb_build_object('task_id', NEW.task_id, 'volunteer_id', NEW.volunteer_id, 'action', 'cancellation', 'urgent', v_is_urgent));
  END IF;

  -- CASE 3: Club assigns volunteer (status changed to 'assigned' via update)
  IF TG_OP = 'UPDATE' AND NEW.status = 'assigned' AND OLD.status != 'assigned' THEN
    -- Try to find zone assignment for this volunteer on this task
    SELECT tz.name INTO v_zone_name
    FROM public.task_zone_assignments tza
    JOIN public.task_zones tz ON tz.id = tza.zone_id
    WHERE tza.volunteer_id = NEW.volunteer_id AND tz.task_id = NEW.task_id
    LIMIT 1;

    v_title := 'Taak toegewezen';
    v_message := 'Je bent toegewezen aan ' || v_task.title
      || CASE WHEN v_zone_name IS NOT NULL THEN ' — Zone: ' || v_zone_name ELSE '' END
      || CASE WHEN v_task.task_date IS NOT NULL THEN ' op ' || to_char(v_task.task_date::timestamptz, 'DD/MM/YYYY') ELSE '' END;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.volunteer_id, v_title, v_message, v_notif_type,
      jsonb_build_object('task_id', NEW.task_id, 'action', 'assigned'));
  END IF;

  RETURN NEW;
END;
$function$;
