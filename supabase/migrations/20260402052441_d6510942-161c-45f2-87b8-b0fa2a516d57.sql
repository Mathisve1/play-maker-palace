
-- Fix: Include club_memberships (active volunteers) in tasks SELECT policy
DROP POLICY IF EXISTS "Club members can read tasks" ON public.tasks;

CREATE POLICY "Club members can read tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  -- Club staff / owner (via club_members legacy table)
  is_club_member(auth.uid(), club_id)
  -- Active volunteers (via club_memberships)
  OR EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.club_id = tasks.club_id
      AND cm.volunteer_id = auth.uid()
      AND cm.status = 'actief'
  )
  -- Volunteers signed up for this task
  OR EXISTS (
    SELECT 1 FROM public.task_signups ts
    WHERE ts.task_id = tasks.id AND ts.volunteer_id = auth.uid()
  )
  -- Partner admins for assigned tasks
  OR (partner_only = true AND assigned_partner_id IS NOT NULL AND is_partner_admin(auth.uid(), assigned_partner_id))
);
