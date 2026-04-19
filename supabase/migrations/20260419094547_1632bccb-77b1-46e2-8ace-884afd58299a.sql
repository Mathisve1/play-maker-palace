
-- Hoofdtabel voor wedstrijdsjablonen
CREATE TABLE public.match_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  closing_template_id UUID REFERENCES public.closing_templates(id) ON DELETE SET NULL,
  certificate_design_id UUID REFERENCES public.certificate_designs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_templates_club ON public.match_templates(club_id);

-- Groepen binnen een sjabloon
CREATE TABLE public.match_template_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_template_id UUID NOT NULL REFERENCES public.match_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  wristband_color TEXT,
  wristband_label TEXT,
  materials_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_template_groups_template ON public.match_template_groups(match_template_id);

-- Taken binnen een sjabloongroep met offsets t.o.v. aftrap
CREATE TABLE public.match_template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_template_id UUID NOT NULL REFERENCES public.match_templates(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.match_template_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  spots_available INTEGER NOT NULL DEFAULT 1,
  -- minuten VOOR aftrap (positief = voor aftrap, negatief = na aftrap)
  start_offset_minutes INTEGER NOT NULL DEFAULT 60,
  end_offset_minutes INTEGER NOT NULL DEFAULT -120,
  briefing_offset_minutes INTEGER,
  briefing_location TEXT,
  notes TEXT,
  compensation_type TEXT NOT NULL DEFAULT 'none',
  expense_amount NUMERIC(10,2),
  hourly_rate NUMERIC,
  estimated_hours NUMERIC,
  daily_rate NUMERIC,
  loyalty_points INTEGER,
  loyalty_eligible BOOLEAN NOT NULL DEFAULT true,
  contract_template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  required_training_id UUID REFERENCES public.academy_trainings(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_template_tasks_template ON public.match_template_tasks(match_template_id);
CREATE INDEX idx_match_template_tasks_group ON public.match_template_tasks(group_id);

-- RLS
ALTER TABLE public.match_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_template_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_template_tasks ENABLE ROW LEVEL SECURITY;

-- Policies match_templates
CREATE POLICY "Club members can view match templates"
  ON public.match_templates FOR SELECT TO authenticated
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

CREATE POLICY "Club admins can insert match templates"
  ON public.match_templates FOR INSERT TO authenticated
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club admins can update match templates"
  ON public.match_templates FOR UPDATE TO authenticated
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club admins can delete match templates"
  ON public.match_templates FOR DELETE TO authenticated
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Policies match_template_groups
CREATE POLICY "Club members can view match template groups"
  ON public.match_template_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

CREATE POLICY "Club admins can insert match template groups"
  ON public.match_template_groups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Club admins can update match template groups"
  ON public.match_template_groups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Club admins can delete match template groups"
  ON public.match_template_groups FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

-- Policies match_template_tasks
CREATE POLICY "Club members can view match template tasks"
  ON public.match_template_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

CREATE POLICY "Club admins can insert match template tasks"
  ON public.match_template_tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Club admins can update match template tasks"
  ON public.match_template_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Club admins can delete match template tasks"
  ON public.match_template_tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.match_templates mt WHERE mt.id = match_template_id AND has_club_role(auth.uid(), mt.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

-- Trigger updated_at
CREATE TRIGGER update_match_templates_updated_at
  BEFORE UPDATE ON public.match_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
