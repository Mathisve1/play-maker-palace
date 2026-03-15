
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_logs_club_created ON public.audit_logs (club_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor_created ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only club members with bestuurder role can read audit logs
CREATE POLICY "Bestuurders can read club audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder']::club_role[])
);

-- Allow inserts from triggers (service role / security definer)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_old jsonb := NULL;
  v_new jsonb := NULL;
  v_resource_id uuid;
  v_club_id uuid := NULL;
  v_actor_id uuid := NULL;
  v_sensitive_fields text[] := ARRAY['email', 'iban', 'bank_iban', 'bank_holder_name'];
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_resource_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_resource_id := NEW.id;

    -- For profiles, only log if sensitive fields changed
    IF TG_TABLE_NAME = 'profiles' THEN
      IF (OLD.email IS NOT DISTINCT FROM NEW.email)
        AND (OLD.bank_iban IS NOT DISTINCT FROM NEW.bank_iban)
        AND (OLD.bank_holder_name IS NOT DISTINCT FROM NEW.bank_holder_name) THEN
        RETURN NEW;
      END IF;
      -- Only include changed sensitive fields
      v_old := jsonb_build_object('email', OLD.email, 'bank_iban', OLD.bank_iban, 'bank_holder_name', OLD.bank_holder_name);
      v_new := jsonb_build_object('email', NEW.email, 'bank_iban', NEW.bank_iban, 'bank_holder_name', NEW.bank_holder_name);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_resource_id := OLD.id;
  END IF;

  -- Try to extract club_id
  IF TG_TABLE_NAME = 'profiles' THEN
    v_club_id := NULL; -- profiles are cross-club
  ELSIF v_new IS NOT NULL AND v_new ? 'club_id' THEN
    v_club_id := (v_new->>'club_id')::uuid;
  ELSIF v_old IS NOT NULL AND v_old ? 'club_id' THEN
    v_club_id := (v_old->>'club_id')::uuid;
  END IF;

  -- For task_signups, get club_id from task
  IF TG_TABLE_NAME = 'task_signups' AND v_club_id IS NULL THEN
    SELECT t.club_id INTO v_club_id FROM public.tasks t WHERE t.id = COALESCE(
      (v_new->>'task_id')::uuid, (v_old->>'task_id')::uuid
    );
  END IF;

  -- Actor
  v_actor_id := auth.uid();

  INSERT INTO public.audit_logs (club_id, actor_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (v_club_id, v_actor_id, v_action, TG_TABLE_NAME, v_resource_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach triggers
CREATE TRIGGER audit_task_signups
AFTER INSERT OR UPDATE OR DELETE ON public.task_signups
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_season_contracts
AFTER INSERT OR UPDATE OR DELETE ON public.season_contracts
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_sepa_batch_items
AFTER INSERT OR UPDATE OR DELETE ON public.sepa_batch_items
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_volunteer_payments
AFTER INSERT OR UPDATE OR DELETE ON public.volunteer_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
