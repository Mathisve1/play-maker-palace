-- Fix infinite recursion: tasks RLS references task_signups, and task_signups RLS references tasks.
-- Solution: use SECURITY DEFINER functions that bypass RLS for the cross-table checks.

-- 1. Function: check if user has a task_signup for a given task
CREATE OR REPLACE FUNCTION public.user_has_task_signup(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_signups
    WHERE volunteer_id = _user_id AND task_id = _task_id
  )
$$;

-- 2. Function: check if user owns the club that owns a task
CREATE OR REPLACE FUNCTION public.user_owns_task_club(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = _task_id AND c.owner_id = _user_id
  )
$$;

-- 3. Function: check if user is club member for a task's club
CREATE OR REPLACE FUNCTION public.user_is_task_club_member(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.club_memberships cm ON cm.club_id = t.club_id
    WHERE t.id = _task_id AND cm.volunteer_id = _user_id AND cm.status = 'actief'
  )
$$;

-- 4. Replace the tasks SELECT policy to use security definer functions instead of inline subqueries on task_signups
DROP POLICY IF EXISTS "Club members can read tasks" ON public.tasks;
CREATE POLICY "Club members can read tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = tasks.club_id AND c.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.club_memberships cm WHERE cm.club_id = tasks.club_id AND cm.volunteer_id = auth.uid())
    OR public.user_has_task_signup(auth.uid(), tasks.id)
    OR (partner_only = true AND assigned_partner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.partner_admins pa WHERE pa.partner_id = tasks.assigned_partner_id AND pa.user_id = auth.uid()
    ))
  );

-- 5. Replace task_signups SELECT policy to use security definer function instead of joining tasks
DROP POLICY IF EXISTS "Club owners can see signups for their tasks" ON public.task_signups;
CREATE POLICY "Club owners can see signups for their tasks" ON public.task_signups
  FOR SELECT TO authenticated
  USING (
    public.user_owns_task_club(auth.uid(), task_signups.task_id)
    OR public.user_is_task_club_member(auth.uid(), task_signups.task_id)
  );

-- 6. Replace task_signups UPDATE policy similarly
DROP POLICY IF EXISTS "Club owners can update signups for their tasks" ON public.task_signups;
CREATE POLICY "Club owners can update signups for their tasks" ON public.task_signups
  FOR UPDATE TO authenticated
  USING (
    public.user_owns_task_club(auth.uid(), task_signups.task_id)
  );