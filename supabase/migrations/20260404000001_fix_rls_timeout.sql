-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260404000001_fix_rls_timeout
-- Purpose  : Replace SECURITY DEFINER functions in RLS policies with inline
--            EXISTS clauses to eliminate N+1 query explosion on tasks table.
--
-- Root cause: Migration 20260403134116 introduced user_has_task_signup(),
-- get_task_club_id(), and user_owns_task_club() as SECURITY DEFINER functions
-- inside USING clauses. PostgreSQL cannot optimize these black-box functions
-- into JOINs, so it runs them once per row — 1,000 tasks = 1,000 sequential
-- queries per HTTP request, causing timeouts and 100% CPU spikes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 1: Drop bad policies and SECURITY DEFINER functions
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Club members can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Club owners can see signups for their tasks" ON public.task_signups;
DROP POLICY IF EXISTS "Club owners can update signups for their tasks" ON public.task_signups;

DROP FUNCTION IF EXISTS public.user_has_task_signup(_user_id uuid, _task_id uuid);
DROP FUNCTION IF EXISTS public.get_task_club_id(_task_id uuid);
DROP FUNCTION IF EXISTS public.user_owns_task_club(_user_id uuid, _task_id uuid);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 2: Recreate tasks SELECT policy with inline EXISTS (no recursion)
-- ═══════════════════════════════════════════════════════════════════════════════
-- No circular dependency: the task_signups clause here checks volunteer_id
-- directly (not via tasks RLS), so there is no recursion loop.
CREATE POLICY "Club members can read tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  -- 1. Club membership
  EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.club_id = tasks.club_id AND cm.volunteer_id = auth.uid()
  )
  -- 2. Partner admin of the assigned partner
  OR (partner_only = true AND assigned_partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.partner_admins pa
    WHERE pa.partner_id = tasks.assigned_partner_id AND pa.user_id = auth.uid()
  ))
  -- 3. Volunteer signed up for this task
  --    (no recursion: task_signups SELECT policy checks volunteer_id = auth.uid(),
  --    which resolves without querying tasks again)
  OR EXISTS (
    SELECT 1 FROM public.task_signups ts
    WHERE ts.task_id = tasks.id AND ts.volunteer_id = auth.uid()
  )
  -- 4. Club owner
  OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = tasks.club_id AND c.owner_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 3: Recreate task_signups club-owner policies with inline JOIN EXISTS
-- ═══════════════════════════════════════════════════════════════════════════════
-- These bypass the tasks RLS recursion risk because the JOIN on clubs.owner_id
-- is evaluated inline by the query planner — no function call, no per-row loop.
CREATE POLICY "Club owners can see signups for their tasks" ON public.task_signups
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_signups.task_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Club owners can update signups for their tasks" ON public.task_signups
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_signups.task_id AND c.owner_id = auth.uid()
  )
);
