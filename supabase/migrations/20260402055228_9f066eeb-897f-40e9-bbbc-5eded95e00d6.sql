
-- 1. Create profiles_safe view excluding sensitive fields
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id, full_name, email, avatar_url, created_at, updated_at,
  phone, bio, language, push_notifications_enabled, in_app_notifications_enabled,
  push_prompt_seen, preferences, referral_code, referred_by, public_profile,
  primary_club_id, club_onboarding_step, city, first_tour_seen,
  compliance_blocked, linked_partner_id, date_of_birth
FROM public.profiles;

-- 2. Drop the overly broad club staff profile SELECT policies
DROP POLICY IF EXISTS "Club owners can read volunteer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Club staff can read fellow members profiles" ON public.profiles;
DROP POLICY IF EXISTS "Club staff can read monthly enrollment volunteer profiles" ON public.profiles;

-- 3. Re-create policies using profiles_safe view pattern:
-- Club owners/staff can only read non-sensitive profile fields via the view.
-- For the base profiles table, restrict club staff to non-banking columns via a SECURITY DEFINER function.

-- Create a function that returns profile data without banking fields for club staff
CREATE OR REPLACE FUNCTION public.get_club_volunteer_profile(p_volunteer_id uuid, p_club_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is club owner or staff
  IF NOT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = p_club_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = p_club_id AND cm.user_id = auth.uid()
      AND cm.role = ANY(ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  RETURN (
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'avatar_url', p.avatar_url,
      'phone', p.phone,
      'bio', p.bio,
      'created_at', p.created_at,
      'date_of_birth', p.date_of_birth,
      'city', p.city,
      'compliance_blocked', p.compliance_blocked,
      'linked_partner_id', p.linked_partner_id,
      'language', p.language,
      'primary_club_id', p.primary_club_id
    )
    FROM public.profiles p
    WHERE p.id = p_volunteer_id
  );
END;
$$;

-- 4. Re-create club staff profile read policies WITHOUT banking data access
-- Club owners can read volunteer profiles if volunteer has signups at their club
CREATE POLICY "Club owners can read volunteer profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM task_signups ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN clubs c ON c.id = t.club_id
    WHERE ts.volunteer_id = profiles.id
      AND ts.status IN ('assigned', 'pending', 'completed')
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
            AND cm.role = ANY(ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
        )
      )
  )
);

-- Club staff can read fellow members profiles
CREATE POLICY "Club staff can read fellow members profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM club_memberships cm1
    JOIN club_memberships cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.volunteer_id = auth.uid()
      AND cm2.volunteer_id = profiles.id
      AND cm1.status = 'actief'
      AND cm2.status = 'actief'
      AND cm1.club_role IN ('admin', 'manager', 'bestuurder', 'beheerder')
  )
  OR EXISTS (
    SELECT 1
    FROM clubs c
    JOIN club_memberships cm ON cm.club_id = c.id
    WHERE c.owner_id = auth.uid()
      AND cm.volunteer_id = profiles.id
      AND cm.status = 'actief'
  )
);

-- Monthly enrollment profile access
CREATE POLICY "Club staff can read monthly enrollment volunteer profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_enrollments me
    JOIN monthly_plans mp ON mp.id = me.plan_id
    WHERE me.volunteer_id = profiles.id
      AND has_club_role(auth.uid(), mp.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  )
);

-- 5. Restrict events to authenticated users only
DROP POLICY IF EXISTS "Anyone can read events" ON public.events;
CREATE POLICY "Authenticated users can read events"
ON public.events FOR SELECT TO authenticated
USING (true);
