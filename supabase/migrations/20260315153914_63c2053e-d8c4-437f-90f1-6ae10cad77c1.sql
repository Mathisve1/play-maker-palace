
-- Add compliance_blocked to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS compliance_blocked boolean NOT NULL DEFAULT false;

-- Create a validation trigger on task_signups to prevent blocked volunteers from signing up
CREATE OR REPLACE FUNCTION public.check_compliance_block()
 RETURNS trigger
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_blocked boolean;
BEGIN
  SELECT compliance_blocked INTO v_blocked
  FROM public.profiles WHERE id = NEW.volunteer_id;

  IF v_blocked = true THEN
    RAISE EXCEPTION 'Volunteer is blocked due to compliance limit reached';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_check_compliance_block ON public.task_signups;
CREATE TRIGGER trg_check_compliance_block
  BEFORE INSERT ON public.task_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.check_compliance_block();
