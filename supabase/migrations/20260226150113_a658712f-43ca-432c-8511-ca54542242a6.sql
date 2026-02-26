
-- 1. Create tables first (no RLS policies yet)
CREATE TABLE public.external_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'stewards',
  contact_name text,
  contact_email text,
  external_payroll boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id, user_id)
);

CREATE TABLE public.partner_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_event_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  max_spots integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id, event_id)
);

CREATE TABLE public.partner_event_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_event_access_id uuid NOT NULL REFERENCES public.partner_event_access(id) ON DELETE CASCADE,
  partner_member_id uuid NOT NULL REFERENCES public.partner_members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_event_access_id, partner_member_id)
);

-- 2. Enable RLS on all tables
ALTER TABLE public.external_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_event_signups ENABLE ROW LEVEL SECURITY;

-- 3. Trigger for updated_at
CREATE TRIGGER update_external_partners_updated_at
  BEFORE UPDATE ON public.external_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Security definer functions (tables exist now)
CREATE OR REPLACE FUNCTION public.is_partner_admin(_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_admins
    WHERE user_id = _user_id AND partner_id = _partner_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_partner_club_id(_partner_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.external_partners WHERE id = _partner_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_signup_partner_id(_access_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id FROM public.partner_event_access WHERE id = _access_id LIMIT 1
$$;

-- 5. RLS Policies

-- external_partners
CREATE POLICY "Club staff can manage partners" ON public.external_partners
  FOR ALL USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Partner admins can read own partner" ON public.external_partners
  FOR SELECT USING (is_partner_admin(auth.uid(), id));

-- partner_admins
CREATE POLICY "Club staff can manage partner admins" ON public.partner_admins
  FOR ALL USING (
    has_club_role(auth.uid(), get_partner_club_id(partner_id), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

CREATE POLICY "Partner admins can read own record" ON public.partner_admins
  FOR SELECT USING (user_id = auth.uid());

-- partner_members
CREATE POLICY "Club staff can read partner members" ON public.partner_members
  FOR SELECT USING (
    has_club_role(auth.uid(), get_partner_club_id(partner_id), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

CREATE POLICY "Partner admins can manage own members" ON public.partner_members
  FOR ALL USING (is_partner_admin(auth.uid(), partner_id));

-- partner_event_access
CREATE POLICY "Club staff can manage event access" ON public.partner_event_access
  FOR ALL USING (
    has_club_role(auth.uid(), get_partner_club_id(partner_id), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

CREATE POLICY "Partner admins can read event access" ON public.partner_event_access
  FOR SELECT USING (is_partner_admin(auth.uid(), partner_id));

-- partner_event_signups
CREATE POLICY "Club staff can read signups" ON public.partner_event_signups
  FOR SELECT USING (
    has_club_role(auth.uid(), get_partner_club_id(get_signup_partner_id(partner_event_access_id)), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

CREATE POLICY "Partner admins can manage signups" ON public.partner_event_signups
  FOR ALL USING (is_partner_admin(auth.uid(), get_signup_partner_id(partner_event_access_id)));
