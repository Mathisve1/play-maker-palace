
-- Enum for season contract template categories
CREATE TYPE public.season_template_category AS ENUM (
  'steward',
  'bar_catering',
  'terrain_material',
  'admin_ticketing',
  'event_support',
  'custom'
);

-- Seasons table: defines club seasons (default July-June)
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Seizoen',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Season contract templates: 5 system defaults + custom per club
CREATE TABLE public.season_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  category season_template_category NOT NULL DEFAULT 'event_support',
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.season_contract_templates ENABLE ROW LEVEL SECURITY;

-- Season contracts: links volunteer to a template for a season
CREATE TABLE public.season_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.season_contract_templates(id),
  status TEXT NOT NULL DEFAULT 'draft',
  signing_url TEXT,
  document_url TEXT,
  docuseal_submission_id INTEGER,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.season_contracts ENABLE ROW LEVEL SECURITY;

-- Volunteer check-ins: attendance log per season
CREATE TABLE public.volunteer_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id),
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  method TEXT NOT NULL DEFAULT 'manual',
  checked_in_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_check_ins ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_seasons_club ON public.seasons(club_id);
CREATE INDEX idx_season_contracts_season ON public.season_contracts(season_id);
CREATE INDEX idx_season_contracts_volunteer ON public.season_contracts(volunteer_id);
CREATE INDEX idx_season_contracts_club ON public.season_contracts(club_id);
CREATE INDEX idx_volunteer_check_ins_volunteer_season ON public.volunteer_check_ins(volunteer_id, season_id);
CREATE INDEX idx_volunteer_check_ins_club ON public.volunteer_check_ins(club_id);
CREATE INDEX idx_season_contract_templates_club ON public.season_contract_templates(club_id);

-- Updated_at triggers
CREATE TRIGGER set_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_season_contract_templates_updated_at BEFORE UPDATE ON public.season_contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_season_contracts_updated_at BEFORE UPDATE ON public.season_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies: seasons
CREATE POLICY "Club members can view their seasons" ON public.seasons FOR SELECT TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()));

CREATE POLICY "Club owners and admins can manage seasons" ON public.seasons FOR ALL TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()));

-- RLS Policies: season_contract_templates
CREATE POLICY "Anyone can view system templates" ON public.season_contract_templates FOR SELECT TO authenticated
  USING (is_system = true);

CREATE POLICY "Club members can view their templates" ON public.season_contract_templates FOR SELECT TO authenticated
  USING (club_id IS NOT NULL AND (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())));

CREATE POLICY "Club admins can manage templates" ON public.season_contract_templates FOR ALL TO authenticated
  USING (club_id IS NOT NULL AND (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())))
  WITH CHECK (club_id IS NOT NULL AND (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())));

-- RLS Policies: season_contracts
CREATE POLICY "Club members can view contracts" ON public.season_contracts FOR SELECT TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()) OR volunteer_id = auth.uid());

CREATE POLICY "Club admins can manage contracts" ON public.season_contracts FOR ALL TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()));

-- RLS Policies: volunteer_check_ins
CREATE POLICY "Club members can view check-ins" ON public.volunteer_check_ins FOR SELECT TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()) OR volunteer_id = auth.uid());

CREATE POLICY "Club staff can manage check-ins" ON public.volunteer_check_ins FOR ALL TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]) OR club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()));

-- Insert the 5 system templates
INSERT INTO public.season_contract_templates (id, club_id, category, name, description, is_system, template_data) VALUES
  (gen_random_uuid(), NULL, 'steward', 'Steward / Veiligheidsmedewerker', 'Voor alle vrijwilligers die instaan voor crowd control, toegang, veiligheid, parking, enz.', true, '[]'::jsonb),
  (gen_random_uuid(), NULL, 'bar_catering', 'Bar- en Cateringpersoneel', 'Voor vrijwilligers achter de bar, in de kantine, foodtrucks, catering of bediening bij events.', true, '[]'::jsonb),
  (gen_random_uuid(), NULL, 'terrain_material', 'Terreinverzorger / Materiaalbeheerder', 'Voor terreinmannen, lijnrechters, materiaalploeg, onderhoud, opbouw/afbraak van infrastructuur.', true, '[]'::jsonb),
  (gen_random_uuid(), NULL, 'admin_ticketing', 'Administratief Medewerker / Ticketing', 'Voor vrijwilligers die instaan voor onthaal, ticketverkoop, inschrijvingen, administratie, secretariaat.', true, '[]'::jsonb),
  (gen_random_uuid(), NULL, 'event_support', 'Event Support / Allround Helper', 'Voor alle andere taken zoals promo, opbouw events, begeleiding jeugd, logistiek, runners, enz.', true, '[]'::jsonb);

-- Enable realtime for season_contracts and volunteer_check_ins
ALTER PUBLICATION supabase_realtime ADD TABLE public.season_contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteer_check_ins;
