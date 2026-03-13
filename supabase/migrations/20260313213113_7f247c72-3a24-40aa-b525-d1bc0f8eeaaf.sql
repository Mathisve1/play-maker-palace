
-- =====================================================
-- FIX 1: Profiles banking data — restrict club member 
-- policy to bestuurder/beheerder only (medewerkers 
-- should NOT see banking data of other members)
-- =====================================================
DROP POLICY IF EXISTS "Club members can read fellow members profiles" ON public.profiles;
CREATE POLICY "Club staff can read fellow members profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm1
      JOIN club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = profiles.id
        AND cm1.role IN ('bestuurder', 'beheerder')
    )
    OR EXISTS (
      SELECT 1 FROM clubs c
      JOIN club_members cm ON cm.club_id = c.id
      WHERE c.owner_id = auth.uid()
        AND cm.user_id = profiles.id
    )
  );

-- Medewerkers can read basic profile info via task signups
-- (they already have this through existing task-based policies)

-- =====================================================
-- FIX 2: Volunteer self-approve prevention
-- Prevent volunteers from modifying admin-only columns
-- =====================================================

-- hour_confirmations: volunteers can only update their own reported fields
DROP POLICY IF EXISTS "Volunteers can update own hour confirmations" ON public.hour_confirmations;
CREATE POLICY "Volunteers can update own hour confirmations"
  ON public.hour_confirmations FOR UPDATE TO public
  USING (auth.uid() = volunteer_id)
  WITH CHECK (
    auth.uid() = volunteer_id
    AND club_approved IS NOT DISTINCT FROM (SELECT hc.club_approved FROM public.hour_confirmations hc WHERE hc.id = hour_confirmations.id)
    AND club_reported_hours IS NOT DISTINCT FROM (SELECT hc.club_reported_hours FROM public.hour_confirmations hc WHERE hc.id = hour_confirmations.id)
    AND club_reported_checkout IS NOT DISTINCT FROM (SELECT hc.club_reported_checkout FROM public.hour_confirmations hc WHERE hc.id = hour_confirmations.id)
    AND final_hours IS NOT DISTINCT FROM (SELECT hc.final_hours FROM public.hour_confirmations hc WHERE hc.id = hour_confirmations.id)
    AND final_amount IS NOT DISTINCT FROM (SELECT hc.final_amount FROM public.hour_confirmations hc WHERE hc.id = hour_confirmations.id)
  );

-- monthly_day_signups: volunteers can only update their own reported fields
DROP POLICY IF EXISTS "Volunteers can update own day signups" ON public.monthly_day_signups;
CREATE POLICY "Volunteers can update own day signups"
  ON public.monthly_day_signups FOR UPDATE TO public
  USING (auth.uid() = volunteer_id)
  WITH CHECK (
    auth.uid() = volunteer_id
    AND club_approved IS NOT DISTINCT FROM (SELECT ds.club_approved FROM public.monthly_day_signups ds WHERE ds.id = monthly_day_signups.id)
    AND club_reported_hours IS NOT DISTINCT FROM (SELECT ds.club_reported_hours FROM public.monthly_day_signups ds WHERE ds.id = monthly_day_signups.id)
    AND club_reported_checkout IS NOT DISTINCT FROM (SELECT ds.club_reported_checkout FROM public.monthly_day_signups ds WHERE ds.id = monthly_day_signups.id)
    AND final_hours IS NOT DISTINCT FROM (SELECT ds.final_hours FROM public.monthly_day_signups ds WHERE ds.id = monthly_day_signups.id)
    AND final_amount IS NOT DISTINCT FROM (SELECT ds.final_amount FROM public.monthly_day_signups ds WHERE ds.id = monthly_day_signups.id)
    AND hour_status IS NOT DISTINCT FROM (SELECT ds.hour_status FROM public.monthly_day_signups ds WHERE ds.id = monthly_day_signups.id)
  );

-- monthly_enrollments: volunteers can only update limited fields
DROP POLICY IF EXISTS "Volunteers can update own enrollments" ON public.monthly_enrollments;
CREATE POLICY "Volunteers can update own enrollments"
  ON public.monthly_enrollments FOR UPDATE TO public
  USING (auth.uid() = volunteer_id)
  WITH CHECK (
    auth.uid() = volunteer_id
    AND approval_status IS NOT DISTINCT FROM (SELECT me.approval_status FROM public.monthly_enrollments me WHERE me.id = monthly_enrollments.id)
    AND contract_status IS NOT DISTINCT FROM (SELECT me.contract_status FROM public.monthly_enrollments me WHERE me.id = monthly_enrollments.id)
  );

-- compliance_declarations: volunteers can update own fields but not signature_status to 'completed'
DROP POLICY IF EXISTS "Volunteers can update own declarations" ON public.compliance_declarations;
CREATE POLICY "Volunteers can update own declarations"
  ON public.compliance_declarations FOR UPDATE TO public
  USING (auth.uid() = volunteer_id)
  WITH CHECK (
    auth.uid() = volunteer_id
    AND (
      signature_status IS NOT DISTINCT FROM (SELECT cd.signature_status FROM public.compliance_declarations cd WHERE cd.id = compliance_declarations.id)
      OR signature_status IN ('pending', 'awaiting')
    )
  );

-- =====================================================
-- FIX 3: Clubs stripe_account_id — create safe view
-- =====================================================
CREATE OR REPLACE VIEW public.clubs_safe
WITH (security_invoker = true) AS
  SELECT id, name, description, location, logo_url, sport, 
         owner_id, allow_shift_swaps, created_at
  FROM public.clubs;

-- Grant access to the view
GRANT SELECT ON public.clubs_safe TO authenticated;
GRANT SELECT ON public.clubs_safe TO anon;
