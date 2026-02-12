
-- Allow club members to see other club members' profiles
CREATE POLICY "Club members can read fellow members profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm1
    JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
  )
);
