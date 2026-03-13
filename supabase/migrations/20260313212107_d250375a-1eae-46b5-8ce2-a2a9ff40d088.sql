
-- Fix: volunteer_certificates - scope to own + club staff
DROP POLICY IF EXISTS "Authenticated can read certificates" ON public.volunteer_certificates;
CREATE POLICY "Volunteers read own certificates"
  ON public.volunteer_certificates FOR SELECT TO authenticated
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Club staff read club certificates"
  ON public.volunteer_certificates FOR SELECT TO authenticated
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]));

-- Fix: profiles - create a view for safe peer lookups (no banking data)
CREATE OR REPLACE FUNCTION public.get_safe_profile(_user_id uuid)
RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, bio text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.avatar_url, p.bio, p.phone
  FROM public.profiles p
  WHERE p.id = _user_id
$$;

-- Fix: club_members INSERT - prevent role escalation by beheerder
DROP POLICY IF EXISTS "Bestuurder and beheerder can insert members" ON public.club_members;
CREATE POLICY "Bestuurder and beheerder can insert members"
  ON public.club_members FOR INSERT TO public
  WITH CHECK (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[])
    AND (
      role <> 'bestuurder'::club_role
      OR has_club_role(auth.uid(), club_id, ARRAY['bestuurder']::club_role[])
    )
  );

-- Fix: certificate_designs - scope to club members
DROP POLICY IF EXISTS "Authenticated can read certificate designs" ON public.certificate_designs;
CREATE POLICY "Club members can read certificate designs"
  ON public.certificate_designs FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));
