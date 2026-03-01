
-- Create safety_roles table (club-level role definitions)
CREATE TABLE public.safety_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  can_complete_checklist BOOLEAN NOT NULL DEFAULT true,
  can_report_incidents BOOLEAN NOT NULL DEFAULT true,
  can_resolve_incidents BOOLEAN NOT NULL DEFAULT false,
  can_complete_closing BOOLEAN NOT NULL DEFAULT true,
  can_view_team BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create volunteer_safety_roles table (assignment per event)
CREATE TABLE public.volunteer_safety_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  safety_role_id UUID NOT NULL REFERENCES public.safety_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, volunteer_id)
);

-- Enable RLS
ALTER TABLE public.safety_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_safety_roles ENABLE ROW LEVEL SECURITY;

-- RLS for safety_roles: authenticated can read, club staff can manage
CREATE POLICY "Anyone authenticated can read safety roles"
  ON public.safety_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage safety roles"
  ON public.safety_roles FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- RLS for volunteer_safety_roles
-- Club staff can manage (via event -> tasks -> club)
CREATE POLICY "Club staff can manage volunteer safety roles"
  ON public.volunteer_safety_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = volunteer_safety_roles.event_id
      AND has_club_role(auth.uid(), e.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
    )
  );

-- Volunteers can read own role
CREATE POLICY "Volunteers can read own safety role"
  ON public.volunteer_safety_roles FOR SELECT
  USING (auth.uid() = volunteer_id);

-- Volunteers with can_view_team can read team roles (same event)
CREATE POLICY "Team leaders can read team safety roles"
  ON public.volunteer_safety_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.volunteer_safety_roles vsr
      JOIN public.safety_roles sr ON sr.id = vsr.safety_role_id
      WHERE vsr.volunteer_id = auth.uid()
      AND vsr.event_id = volunteer_safety_roles.event_id
      AND sr.can_view_team = true
    )
  );
