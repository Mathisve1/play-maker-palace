-- Migration: rename buddy_id → receiver_id in volunteer_buddies
-- Aligns column naming with the two-party handshake model (requester sends, receiver accepts)

ALTER TABLE public.volunteer_buddies RENAME COLUMN buddy_id TO receiver_id;

-- Drop old RLS policies that reference buddy_id
DROP POLICY IF EXISTS "buddies_select" ON public.volunteer_buddies;
DROP POLICY IF EXISTS "buddies_update" ON public.volunteer_buddies;
DROP POLICY IF EXISTS "buddies_delete" ON public.volunteer_buddies;

-- Recreate with updated column references
CREATE POLICY "buddies_select" ON public.volunteer_buddies
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
  );

CREATE POLICY "buddies_update" ON public.volunteer_buddies
  FOR UPDATE USING (
    auth.uid() = receiver_id
  );

CREATE POLICY "buddies_delete" ON public.volunteer_buddies
  FOR DELETE USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
  );

-- Also update the INSERT policy reference (receiver_id used in check context)
DROP POLICY IF EXISTS "buddies_insert" ON public.volunteer_buddies;
CREATE POLICY "buddies_insert" ON public.volunteer_buddies
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
  );
