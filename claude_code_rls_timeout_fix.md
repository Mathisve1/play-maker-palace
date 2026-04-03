# Claude Code Prompt: PostgreSQL N+1 RLS Timeout Fix

**Goal:** The `PartnerDashboard.tsx` is completely freezing, timing out, and failing to load. This was caused by the recent migration `20260403134116_b7819960-fffc-4fbd-b92e-1f63e5d216eb.sql` which attempted to fix a circular RLS dependency by introducing `SECURITY DEFINER` functions like `user_has_task_signup` inside the `USING` clause of the `tasks` and `task_signups` policies.

## 🚨 The Issue: N+1 Query Explosion
Using a custom Postgres function (even `STABLE` and `SECURITY DEFINER`) inside an RLS policy prevents the PostgreSQL query planner from optimizing `EXISTS` into `JOIN`s. Instead, PostgreSQL runs the black box function sequentially for **every single row** in the `tasks` table. If there are 1,000 tasks, it runs 1,000 separate SELECT queries per HTTP request, causing massive timeouts and 100% CPU lockups.

## 🛠️ Instructions for Claude Code
Act as a Senior Database Performance Engineer. We need to tear down those `SECURITY DEFINER` functions and use inline `EXISTS (SELECT 1 ...)` queries. To bypass the "infinite recursion" circular dependency between `tasks` and `task_signups` RLS, you must be extremely precise in how you structure the `EXISTS` clauses.

Write and apply a new migration (e.g. `20260404000001_fix_rls_timeout.sql`).

### Step 1: Drop the black box functions and policies
```sql
DROP POLICY IF EXISTS "Club members can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Club owners can see signups for their tasks" ON public.task_signups;
DROP POLICY IF EXISTS "Club owners can update signups for their tasks" ON public.task_signups;

DROP FUNCTION IF EXISTS public.user_has_task_signup(_user_id uuid, _task_id uuid);
DROP FUNCTION IF EXISTS public.get_task_club_id(_task_id uuid);
DROP FUNCTION IF EXISTS public.user_owns_task_club(_user_id uuid, _task_id uuid);
```

### Step 2: Create highly optimized, NON-RECURSIVE `tasks` SELECT policy
```sql
CREATE POLICY "Club members can read tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  -- 1. Club membership
  EXISTS (
    SELECT 1 FROM public.club_memberships cm 
    WHERE cm.club_id = tasks.club_id AND cm.user_id = auth.uid()
  )
  -- 2. Partner admin of the assigned partner
  OR (partner_only = true AND assigned_partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.partner_admins pa 
    WHERE pa.partner_id = tasks.assigned_partner_id AND pa.user_id = auth.uid()
  ))
  -- 3. They actually signed up for it (NO recursion because we don't query tasks from inside task_signups SELECT)
  OR EXISTS (
    SELECT 1 FROM public.task_signups ts 
    WHERE ts.task_id = id AND ts.volunteer_id = auth.uid()
  )
  -- 4. Owner check
  OR EXISTS (
    SELECT 1 FROM public.clubs c 
    WHERE c.id = tasks.club_id AND c.owner_id = auth.uid()
  )
);
```

### Step 3: Fix `task_signups` SELECT and UPDATE policies
The circular dependency usually happens if `task_signups` RLS policy queries `tasks` which in turn queries `task_signups`. To break this natively, the `task_signups` policy should NOT trigger the `tasks` policy. 

```sql
CREATE POLICY "Club owners can see signups for their tasks" ON public.task_signups
FOR SELECT TO authenticated
USING (
  -- Owner check avoiding tasks RLS via explicit JOIN matching the table ids
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
```

**Task:** Please implement this new migration exactly, run it against the database, and verify the frontend Partner Dashboard loads fast again.
