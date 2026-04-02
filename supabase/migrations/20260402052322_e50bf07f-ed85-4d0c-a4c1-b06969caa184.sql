
-- 1. FIX TASKS TABLE: Replace overly broad SELECT policy with scoped access
-- Allow: club members (via is_club_member), volunteers signed up for the task, partner admins
DROP POLICY IF EXISTS "Authenticated can read tasks" ON public.tasks;

CREATE POLICY "Club members can read tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  -- Club staff / owner
  is_club_member(auth.uid(), club_id)
  -- Volunteers signed up for this task
  OR EXISTS (
    SELECT 1 FROM public.task_signups ts
    WHERE ts.task_id = tasks.id AND ts.volunteer_id = auth.uid()
  )
  -- Partner admins for assigned tasks
  OR (partner_only = true AND assigned_partner_id IS NOT NULL AND is_partner_admin(auth.uid(), assigned_partner_id))
);

-- 2. FIX VOLUNTEER_REWARDS: Restrict INSERT/UPDATE to club staff only
DROP POLICY IF EXISTS "rewards_insert_club" ON public.volunteer_rewards;
DROP POLICY IF EXISTS "rewards_update_club" ON public.volunteer_rewards;

-- Only club staff (bestuurder/beheerder) or club owner can insert rewards
CREATE POLICY "rewards_insert_staff"
ON public.volunteer_rewards FOR INSERT
TO authenticated
WITH CHECK (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  OR EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
);

-- Only club staff (bestuurder/beheerder) or club owner can update rewards
CREATE POLICY "rewards_update_staff"
ON public.volunteer_rewards FOR UPDATE
TO authenticated
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  OR EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
);

-- 3. REMOVE ANONYMOUS UPLOAD to sponsor_media
-- The public sponsor wizard needs to be updated to use authenticated upload or a server-side upload
DROP POLICY IF EXISTS "sponsor_media_insert_anon" ON storage.objects;
