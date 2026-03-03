
-- Allow club staff to read profiles of volunteers enrolled in their monthly plans
CREATE POLICY "Club staff can read monthly enrollment volunteer profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM monthly_enrollments me
    JOIN monthly_plans mp ON mp.id = me.plan_id
    WHERE me.volunteer_id = profiles.id
    AND has_club_role(auth.uid(), mp.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  )
);
