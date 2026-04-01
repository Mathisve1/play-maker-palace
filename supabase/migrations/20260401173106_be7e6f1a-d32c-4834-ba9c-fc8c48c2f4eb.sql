-- 1. Fix audit_logs: restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Fix sponsor_campaigns: remove overly permissive SELECT policy
DROP POLICY IF EXISTS "sponsor_campaigns_select" ON public.sponsor_campaigns;
CREATE POLICY "sponsor_campaigns_select"
ON public.sponsor_campaigns FOR SELECT
TO authenticated
USING (
  club_id IN (
    SELECT id FROM public.clubs WHERE owner_id = auth.uid()
    UNION
    SELECT club_id FROM public.club_memberships
    WHERE volunteer_id = auth.uid() AND status = 'actief'
  )
);

-- 3. Fix contract-templates storage: scope to club owners/members
DROP POLICY IF EXISTS "Club members can read own contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Club staff can upload contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Club staff can delete contract PDFs" ON storage.objects;

CREATE POLICY "Club owners can upload contract PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-templates'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.clubs WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Club members can read contract PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-templates'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.clubs WHERE owner_id = auth.uid()
    UNION
    SELECT 1 FROM public.club_memberships WHERE volunteer_id = auth.uid() AND status = 'actief'
  )
);

CREATE POLICY "Club owners can delete contract PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-templates'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.clubs WHERE owner_id = auth.uid()
  )
);