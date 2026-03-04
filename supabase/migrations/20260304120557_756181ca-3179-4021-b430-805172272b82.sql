-- Fix: replace overly permissive policy with proper scoped policies
DROP POLICY IF EXISTS "Service role can manage translations" ON public.content_translations;

-- Only allow inserts from authenticated users (edge functions use service role, which bypasses RLS)
CREATE POLICY "Authenticated users can insert translations"
ON public.content_translations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update translations"
ON public.content_translations FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);