-- Allow club owners to update signups for their tasks (e.g. pending -> assigned)
CREATE POLICY "Club owners can update signups for their tasks"
ON public.task_signups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN clubs c ON t.club_id = c.id
    WHERE t.id = task_signups.task_id AND c.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN clubs c ON t.club_id = c.id
    WHERE t.id = task_signups.task_id AND c.owner_id = auth.uid()
  )
);