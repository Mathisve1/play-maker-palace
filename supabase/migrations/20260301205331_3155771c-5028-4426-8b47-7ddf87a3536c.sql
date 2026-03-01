
-- Closing templates: reusable per club
CREATE TABLE public.closing_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Standaard Afsluiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.closing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can manage closing templates"
  ON public.closing_templates FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Authenticated can read closing templates"
  ON public.closing_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Closing template items: individual tasks within a template
CREATE TABLE public.closing_template_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.closing_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  requires_photo boolean NOT NULL DEFAULT false,
  requires_note boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.closing_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can manage closing template items"
  ON public.closing_template_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.closing_templates ct
    WHERE ct.id = closing_template_items.template_id
    AND has_club_role(auth.uid(), ct.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

CREATE POLICY "Authenticated can read closing template items"
  ON public.closing_template_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Closing tasks: instantiated from a template for a specific event
CREATE TABLE public.closing_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  template_item_id uuid REFERENCES public.closing_template_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  requires_photo boolean NOT NULL DEFAULT false,
  requires_note boolean NOT NULL DEFAULT false,
  assigned_volunteer_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  photo_url text,
  note text,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.closing_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can manage closing tasks"
  ON public.closing_tasks FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Assigned volunteers can read own closing tasks"
  ON public.closing_tasks FOR SELECT
  USING (auth.uid() = assigned_volunteer_id);

CREATE POLICY "Assigned volunteers can update own closing tasks"
  ON public.closing_tasks FOR UPDATE
  USING (auth.uid() = assigned_volunteer_id);

-- Link event to closing template
ALTER TABLE public.events ADD COLUMN closing_template_id uuid REFERENCES public.closing_templates(id) ON DELETE SET NULL;

-- Enable realtime for closing_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.closing_tasks;
