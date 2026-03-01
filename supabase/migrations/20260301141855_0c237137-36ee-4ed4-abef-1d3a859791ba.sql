
-- Safety zones per event
CREATE TABLE public.safety_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal', -- normal, warning, critical
  color TEXT NOT NULL DEFAULT '#22c55e',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read safety zones"
  ON public.safety_zones FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage safety zones"
  ON public.safety_zones FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Checklist items per event (configurable by club)
CREATE TABLE public.safety_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  zone_id UUID REFERENCES public.safety_zones(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read checklist items"
  ON public.safety_checklist_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage checklist items"
  ON public.safety_checklist_items FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Checklist progress (steward completions)
CREATE TABLE public.safety_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id UUID NOT NULL REFERENCES public.safety_checklist_items(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(checklist_item_id, volunteer_id)
);

ALTER TABLE public.safety_checklist_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can manage own progress"
  ON public.safety_checklist_progress FOR ALL
  USING (auth.uid() = volunteer_id)
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Club staff can read all progress"
  ON public.safety_checklist_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM safety_checklist_items sci
    WHERE sci.id = safety_checklist_progress.checklist_item_id
    AND has_club_role(auth.uid(), sci.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

-- Club-configurable incident types
CREATE TABLE public.safety_incident_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'AlertTriangle',
  color TEXT NOT NULL DEFAULT '#ef4444',
  default_priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_incident_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read incident types"
  ON public.safety_incident_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage incident types"
  ON public.safety_incident_types FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Incidents
CREATE TABLE public.safety_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  incident_type_id UUID REFERENCES public.safety_incident_types(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.safety_zones(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'nieuw', -- nieuw, bezig, opgelost
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read incidents"
  ON public.safety_incidents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can report incidents"
  ON public.safety_incidents FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Club staff can update incidents"
  ON public.safety_incidents FOR UPDATE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club staff can delete incidents"
  ON public.safety_incidents FOR DELETE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Enable realtime for incidents and zone status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_checklist_progress;
