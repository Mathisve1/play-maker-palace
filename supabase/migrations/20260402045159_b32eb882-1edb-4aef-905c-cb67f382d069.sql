
-- 1. Fix quiz_questions: remove the permissive SELECT policy that exposes correct_answer_index
-- Force all reads to go through quiz_questions_safe view instead
DROP POLICY IF EXISTS "Authenticated can read published quiz questions without answers" ON public.quiz_questions;

-- Grant SELECT on the safe view to authenticated users (view already exists and excludes correct_answer_index)
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- 2. Fix sponsor_metrics: remove overly permissive SELECT (OR anon OR auth.uid() IS NOT NULL makes it public)
DROP POLICY IF EXISTS "sponsor_metrics_select" ON public.sponsor_metrics;
CREATE POLICY "sponsor_metrics_select"
ON public.sponsor_metrics FOR SELECT
TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM public.sponsor_campaigns
    WHERE club_id IN (
      SELECT id FROM public.clubs WHERE owner_id = auth.uid()
      UNION
      SELECT club_id FROM public.club_memberships
      WHERE volunteer_id = auth.uid() AND status = 'actief'
    )
  )
);

-- 3. Fix sponsor_media storage delete: add ownership check (path must start with user's folder)
DROP POLICY IF EXISTS "sponsor_media_delete_auth" ON storage.objects;
CREATE POLICY "sponsor_media_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sponsor_media'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
