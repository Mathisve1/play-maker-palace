
-- Zone tree structure for tasks (unlimited depth)
CREATE TABLE public.task_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.task_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volunteer assignments to zones
CREATE TABLE public.task_zone_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.task_zones(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(zone_id, volunteer_id)
);

-- Add zone config to tasks
ALTER TABLE public.tasks 
  ADD COLUMN zone_signup_mode TEXT NOT NULL DEFAULT 'club_only',
  ADD COLUMN zone_visible_depth INTEGER;

-- Indexes
CREATE INDEX idx_task_zones_task_id ON public.task_zones(task_id);
CREATE INDEX idx_task_zones_parent_id ON public.task_zones(parent_id);
CREATE INDEX idx_task_zone_assignments_zone_id ON public.task_zone_assignments(zone_id);
CREATE INDEX idx_task_zone_assignments_volunteer_id ON public.task_zone_assignments(volunteer_id);

-- RLS for task_zones
ALTER TABLE public.task_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible zones" ON public.task_zones
  FOR SELECT USING (true);

CREATE POLICY "Club owners can insert zones" ON public.task_zones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM clubs WHERE id = (SELECT club_id FROM tasks WHERE id = task_zones.task_id) AND owner_id = auth.uid())
    OR has_club_role(auth.uid(), (SELECT club_id FROM tasks WHERE id = task_zones.task_id), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

CREATE POLICY "Club owners can update zones" ON public.task_zones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM clubs WHERE id = (SELECT club_id FROM tasks WHERE id = task_zones.task_id) AND owner_id = auth.uid())
    OR has_club_role(auth.uid(), (SELECT club_id FROM tasks WHERE id = task_zones.task_id), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

CREATE POLICY "Club owners can delete zones" ON public.task_zones
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM clubs WHERE id = (SELECT club_id FROM tasks WHERE id = task_zones.task_id) AND owner_id = auth.uid())
    OR has_club_role(auth.uid(), (SELECT club_id FROM tasks WHERE id = task_zones.task_id), ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

-- RLS for task_zone_assignments
ALTER TABLE public.task_zone_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can manage zone assignments" ON public.task_zone_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM task_zones tz 
      JOIN tasks t ON t.id = tz.task_id 
      WHERE tz.id = task_zone_assignments.zone_id 
      AND (
        EXISTS (SELECT 1 FROM clubs WHERE id = t.club_id AND owner_id = auth.uid())
        OR has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
      )
    )
  );

CREATE POLICY "Volunteers can read own assignments" ON public.task_zone_assignments
  FOR SELECT USING (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can self-assign to zones" ON public.task_zone_assignments
  FOR INSERT WITH CHECK (
    auth.uid() = volunteer_id
    AND EXISTS (
      SELECT 1 FROM task_zones tz 
      JOIN tasks t ON t.id = tz.task_id 
      WHERE tz.id = task_zone_assignments.zone_id 
      AND t.zone_signup_mode IN ('volunteer_choice', 'both')
      AND tz.is_visible = true
    )
  );

CREATE POLICY "Volunteers can remove own assignment" ON public.task_zone_assignments
  FOR DELETE USING (
    auth.uid() = volunteer_id
    AND EXISTS (
      SELECT 1 FROM task_zones tz 
      JOIN tasks t ON t.id = tz.task_id 
      WHERE tz.id = task_zone_assignments.zone_id 
      AND t.zone_signup_mode IN ('volunteer_choice', 'both')
    )
  );
