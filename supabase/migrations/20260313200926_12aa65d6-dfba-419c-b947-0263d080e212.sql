
-- Event templates table
CREATE TABLE public.event_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owners/members can view templates"
  ON public.event_templates FOR SELECT TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[]));

CREATE POLICY "Club owners/managers can insert templates"
  ON public.event_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

CREATE POLICY "Club owners/managers can update templates"
  ON public.event_templates FOR UPDATE TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

CREATE POLICY "Club owners/managers can delete templates"
  ON public.event_templates FOR DELETE TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

-- Updated_at trigger
CREATE TRIGGER update_event_templates_updated_at
  BEFORE UPDATE ON public.event_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
