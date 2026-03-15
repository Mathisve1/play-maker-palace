
-- Task templates: individual reusable task definitions
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIME,
  end_time TIME,
  required_volunteers INTEGER NOT NULL DEFAULT 1,
  contract_template_category TEXT,
  briefing_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task template sets: bundles of task templates
CREATE TABLE public.task_template_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table: which templates belong to which set
CREATE TABLE public.task_template_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES public.task_template_sets(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(set_id, template_id)
);

-- RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view task templates"
  ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club members can manage task templates"
  ON public.task_templates FOR ALL TO authenticated
  USING (public.is_club_member(auth.uid(), club_id))
  WITH CHECK (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club members can view task template sets"
  ON public.task_template_sets FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club members can manage task template sets"
  ON public.task_template_sets FOR ALL TO authenticated
  USING (public.is_club_member(auth.uid(), club_id))
  WITH CHECK (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club members can view set items"
  ON public.task_template_set_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_template_sets s
    WHERE s.id = set_id AND public.is_club_member(auth.uid(), s.club_id)
  ));

CREATE POLICY "Club members can manage set items"
  ON public.task_template_set_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_template_sets s
    WHERE s.id = set_id AND public.is_club_member(auth.uid(), s.club_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_template_sets s
    WHERE s.id = set_id AND public.is_club_member(auth.uid(), s.club_id)
  ));
