
-- Drop the existing overly-complex ALL policy on external_partners
DROP POLICY IF EXISTS "Club staff can manage partners" ON public.external_partners;

-- Create separate, clear policies for each operation

-- SELECT: club staff can view partners of their club directly via club_id
CREATE POLICY "Club staff can view partners"
  ON public.external_partners FOR SELECT
  TO authenticated
  USING (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR (SELECT owner_id FROM public.clubs WHERE id = club_id) = auth.uid()
  );

-- INSERT: club staff can create partners for their club
CREATE POLICY "Club staff can insert partners"
  ON public.external_partners FOR INSERT
  TO authenticated
  WITH CHECK (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR (SELECT owner_id FROM public.clubs WHERE id = club_id) = auth.uid()
  );

-- UPDATE: club staff can update partners of their club
CREATE POLICY "Club staff can update partners"
  ON public.external_partners FOR UPDATE
  TO authenticated
  USING (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR (SELECT owner_id FROM public.clubs WHERE id = club_id) = auth.uid()
  )
  WITH CHECK (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR (SELECT owner_id FROM public.clubs WHERE id = club_id) = auth.uid()
  );

-- DELETE: club staff can delete partners of their club
CREATE POLICY "Club staff can delete partners"
  ON public.external_partners FOR DELETE
  TO authenticated
  USING (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR (SELECT owner_id FROM public.clubs WHERE id = club_id) = auth.uid()
  );
