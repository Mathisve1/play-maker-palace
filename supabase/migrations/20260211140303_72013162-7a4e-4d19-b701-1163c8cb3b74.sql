-- Allow club owners to read profiles of volunteers who signed up for their tasks
CREATE POLICY "Club owners can read volunteer profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.task_signups ts
    JOIN public.tasks t ON t.id = ts.task_id
    JOIN public.clubs c ON c.id = t.club_id
    WHERE ts.volunteer_id = profiles.id
      AND (c.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.club_members cm
        WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
          AND cm.role IN ('bestuurder', 'beheerder')
      ))
  )
);