
-- Create a trigger function that calls the auto-send-season-contract edge function
-- when club_memberships.status changes to 'active'
CREATE OR REPLACE FUNCTION public.trigger_auto_send_season_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Only fire when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Use pg_net to call the edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-send-season-contract',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'membership_id', NEW.id,
        'volunteer_id', NEW.volunteer_id,
        'club_id', NEW.club_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on club_memberships
DROP TRIGGER IF EXISTS on_membership_activated ON public.club_memberships;
CREATE TRIGGER on_membership_activated
  AFTER INSERT OR UPDATE OF status ON public.club_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_send_season_contract();
