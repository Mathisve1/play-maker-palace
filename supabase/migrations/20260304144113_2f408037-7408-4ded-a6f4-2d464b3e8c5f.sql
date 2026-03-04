CREATE POLICY "Conversation participants can read each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (
      (c.volunteer_id = auth.uid() AND c.club_owner_id = profiles.id)
      OR
      (c.club_owner_id = auth.uid() AND c.volunteer_id = profiles.id)
    )
  )
);