-- ─────────────────────────────────────────────────────────────────────────────
-- B2B2C Partner Pool Architecture
-- Phase 1: Account Linking, Payroll Routing, Group-Buddy Infrastructure
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add is_active to existing external_partners table ─────────────────────
ALTER TABLE public.external_partners
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_external_partners_club_active
  ON public.external_partners(club_id, is_active);

-- ── 2. Link volunteer profiles to a partner ──────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linked_partner_id UUID
    REFERENCES public.external_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_linked_partner_id
  ON public.profiles(linked_partner_id);

-- ── 3. Payroll routing on task_signups ───────────────────────────────────────
ALTER TABLE public.task_signups
  ADD COLUMN IF NOT EXISTS payroll_entity TEXT
    NOT NULL DEFAULT 'club'
    CHECK (payroll_entity IN ('club', 'partner'));

CREATE INDEX IF NOT EXISTS idx_task_signups_payroll_partner
  ON public.task_signups(payroll_entity)
  WHERE payroll_entity = 'partner';

-- ── 4. Trigger: auto-route payroll on task_signup INSERT ─────────────────────
CREATE OR REPLACE FUNCTION public.set_signup_payroll_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id  UUID;
  v_ext_payroll BOOLEAN;
BEGIN
  SELECT p.linked_partner_id INTO v_partner_id
  FROM   public.profiles p
  WHERE  p.id = NEW.volunteer_id;

  IF v_partner_id IS NOT NULL THEN
    SELECT ep.external_payroll INTO v_ext_payroll
    FROM   public.external_partners ep
    WHERE  ep.id = v_partner_id;

    IF v_ext_payroll = true THEN
      NEW.payroll_entity := 'partner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_signup_payroll_entity ON public.task_signups;
CREATE TRIGGER trg_set_signup_payroll_entity
  BEFORE INSERT ON public.task_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_signup_payroll_entity();

-- ── 5. complete_partner_registration(p_user_id, p_partner_id) ────────────────
CREATE OR REPLACE FUNCTION public.complete_partner_registration(
  p_user_id    UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id      UUID;
  v_partner_name TEXT;
BEGIN
  SELECT club_id, name INTO v_club_id, v_partner_name
  FROM   public.external_partners
  WHERE  id = p_partner_id AND is_active = true;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Partner not found or inactive: %', p_partner_id;
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET    linked_partner_id = p_partner_id
  WHERE  id = p_user_id;

  INSERT INTO public.club_memberships (club_id, volunteer_id, status, club_role)
  VALUES (v_club_id, p_user_id, 'actief', 'vrijwilliger')
  ON CONFLICT (club_id, volunteer_id) DO UPDATE SET status = 'actief';

  UPDATE public.partner_members pm
  SET    user_id = p_user_id
  FROM   public.profiles pr
  WHERE  pm.partner_id = p_partner_id
    AND  pm.email      = pr.email
    AND  pr.id         = p_user_id
    AND  pm.user_id    IS NULL;

  RETURN jsonb_build_object(
    'partner_id',   p_partner_id,
    'partner_name', v_partner_name,
    'club_id',      v_club_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_partner_registration(UUID, UUID) TO authenticated;

-- ── 6. get_partner_colleagues_on_task(p_task_id, p_viewer_id) ────────────────
CREATE OR REPLACE FUNCTION public.get_partner_colleagues_on_task(
  p_task_id   UUID,
  p_viewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id   UUID;
  v_partner_name TEXT;
  v_count        INT;
  v_names        JSONB;
BEGIN
  SELECT linked_partner_id INTO v_partner_id
  FROM   public.profiles WHERE id = p_viewer_id;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('count', 0, 'partner_name', null, 'names', '[]'::jsonb);
  END IF;

  SELECT name INTO v_partner_name
  FROM   public.external_partners WHERE id = v_partner_id;

  SELECT COUNT(*)::INT,
         jsonb_agg(p.full_name ORDER BY p.full_name)
  INTO   v_count, v_names
  FROM   public.task_signups ts
  JOIN   public.profiles p ON p.id = ts.volunteer_id
  WHERE  ts.task_id          = p_task_id
    AND  p.linked_partner_id = v_partner_id
    AND  ts.volunteer_id    <> p_viewer_id
    AND  ts.status           IN ('assigned', 'pending')
    AND  ts.is_draft         = false;

  RETURN jsonb_build_object(
    'count',        COALESCE(v_count, 0),
    'partner_name', v_partner_name,
    'names',        COALESCE(v_names, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_colleagues_on_task(UUID, UUID) TO authenticated;

-- ── 7. get_partner_group_buddies(p_user_id) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_partner_group_buddies(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id   UUID;
  v_partner_name TEXT;
  v_result       JSONB;
BEGIN
  SELECT linked_partner_id INTO v_partner_id
  FROM   public.profiles WHERE id = p_user_id;

  IF v_partner_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT name INTO v_partner_name
  FROM   public.external_partners WHERE id = v_partner_id;

  SELECT jsonb_agg(jsonb_build_object(
    'user_id',      p.id,
    'full_name',    p.full_name,
    'avatar_url',   p.avatar_url,
    'partner_name', v_partner_name
  ) ORDER BY p.full_name)
  INTO v_result
  FROM public.profiles p
  WHERE p.linked_partner_id = v_partner_id
    AND p.id               <> p_user_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_group_buddies(UUID) TO authenticated;
