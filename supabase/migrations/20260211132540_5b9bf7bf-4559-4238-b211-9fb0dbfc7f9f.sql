
-- Drop the overly permissive INSERT policy and replace with one that only allows service role
DROP POLICY "Service role can insert notifications" ON public.notifications;

-- No INSERT policy needed for regular users - only service role (which bypasses RLS) will insert
