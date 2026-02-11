
-- Drop restrictive INSERT policy
DROP POLICY "Club leaders can create templates" ON public.contract_templates;

-- Allow all club members (any role) to insert templates
CREATE POLICY "Club members can create templates"
ON public.contract_templates FOR INSERT
TO authenticated
WITH CHECK (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
);

-- Also update SELECT so all members can read
DROP POLICY "Club leaders can read templates" ON public.contract_templates;

CREATE POLICY "Club members can read templates"
ON public.contract_templates FOR SELECT
TO authenticated
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
);
