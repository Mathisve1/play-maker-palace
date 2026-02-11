
-- Add UPDATE policy for contract_templates
CREATE POLICY "Club members can update templates"
ON public.contract_templates FOR UPDATE
TO authenticated
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
)
WITH CHECK (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
);
