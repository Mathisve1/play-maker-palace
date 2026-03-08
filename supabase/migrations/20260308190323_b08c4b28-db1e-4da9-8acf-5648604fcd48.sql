
-- Add docuseal_template_id to season_contract_templates for caching
ALTER TABLE public.season_contract_templates ADD COLUMN IF NOT EXISTS docuseal_template_id integer;

-- RLS: Allow volunteers to read their own season_contracts
CREATE POLICY "Volunteers can read own season contracts"
ON public.season_contracts FOR SELECT TO authenticated
USING (volunteer_id = auth.uid());

-- RLS: Allow club owners/members to read club season contracts
CREATE POLICY "Club members can read club season contracts"
ON public.season_contracts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
  OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[])
);

-- RLS: Allow club owners/members to insert season contracts
CREATE POLICY "Club members can insert season contracts"
ON public.season_contracts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
  OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[])
);

-- RLS: Allow club owners/members to update season contracts
CREATE POLICY "Club members can update season contracts"
ON public.season_contracts FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
  OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[])
);

-- RLS: Volunteers can read season_contract_templates (system + their club)
CREATE POLICY "Authenticated can read season templates"
ON public.season_contract_templates FOR SELECT TO authenticated
USING (is_system = true OR club_id IS NULL OR EXISTS (
  SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()
) OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]));

-- RLS: Seasons - members can read
CREATE POLICY "Club members can read seasons"
ON public.seasons FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
  OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[])
);

-- RLS: Seasons - owners can insert
CREATE POLICY "Club owners can insert seasons"
ON public.seasons FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
  OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[])
);

-- RLS: Seasons - owners can update
CREATE POLICY "Club owners can update seasons"
ON public.seasons FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
  OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[])
);

-- Enable RLS on all three tables
ALTER TABLE public.season_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
