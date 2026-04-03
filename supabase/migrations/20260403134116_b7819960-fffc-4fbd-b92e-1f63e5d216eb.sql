
-- SECURITY DEFINER function: check if user has a signup for a given task
-- This breaks the circular dependency between tasks and task_signups RLS
CREATE OR REPLACE FUNCTION public.user_has_task_signup(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_signups
    WHERE volunteer_id = _user_id AND task_id = _task_id
  )
$$;

-- SECURITY DEFINER function: get club_id for a task (bypasses tasks RLS)
CREATE OR REPLACE FUNCTION public.get_task_club_id(_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.tasks WHERE id = _task_id LIMIT 1
$$;

-- SECURITY DEFINER function: check if user owns the club of a task
CREATE OR REPLACE FUNCTION public.user_owns_task_club(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = _task_id AND c.owner_id = _user_id
  )
$$;

-- Fix tasks SELECT policy: replace inline task_signups query with SECURITY DEFINER function
DROP POLICY IF EXISTS "Club members can read tasks" ON public.tasks;
CREATE POLICY "Club members can read tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  is_club_member(auth.uid(), club_id)
  OR EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.club_id = tasks.club_id
      AND cm.volunteer_id = auth.uid()
      AND cm.status = 'actief'
  )
  OR user_has_task_signup(auth.uid(), id)
  OR (partner_only = true AND assigned_partner_id IS NOT NULL AND is_partner_admin(auth.uid(), assigned_partner_id))
);

-- Fix task_signups SELECT policy for club owners: use SECURITY DEFINER function instead of joining tasks
DROP POLICY IF EXISTS "Club owners can see signups for their tasks" ON public.task_signups;
CREATE POLICY "Club owners can see signups for their tasks" ON public.task_signups
FOR SELECT TO authenticated
USING (
  user_owns_task_club(auth.uid(), task_id)
);

-- Fix task_signups UPDATE policy for club owners similarly
DROP POLICY IF EXISTS "Club owners can update signups for their tasks" ON public.task_signups;
CREATE POLICY "Club owners can update signups for their tasks" ON public.task_signups
FOR UPDATE TO authenticated
USING (
  user_owns_task_club(auth.uid(), task_id)
);

-- Also remove the duplicate partner policy on tasks (already covered in "Club members can read tasks")
DROP POLICY IF EXISTS "Partner admins can read assigned tasks" ON public.tasks;
