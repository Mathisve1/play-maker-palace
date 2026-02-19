
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event_groups table
CREATE TABLE public.event_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add event columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN event_group_id UUID REFERENCES public.event_groups(id) ON DELETE SET NULL;

-- Updated_at trigger for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_groups ENABLE ROW LEVEL SECURITY;

-- Events RLS: anyone can read
CREATE POLICY "Anyone can read events"
  ON public.events FOR SELECT
  USING (true);

-- Events RLS: club owners can insert
CREATE POLICY "Club owners can insert events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = events.club_id AND owner_id = auth.uid())
    OR has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

-- Events RLS: club owners can update
CREATE POLICY "Club owners can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = events.club_id AND owner_id = auth.uid())
    OR has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

-- Events RLS: club owners can delete
CREATE POLICY "Club owners can delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = events.club_id AND owner_id = auth.uid())
    OR has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  );

-- Event groups RLS: anyone can read
CREATE POLICY "Anyone can read event_groups"
  ON public.event_groups FOR SELECT
  USING (true);

-- Event groups RLS: club owners can insert
CREATE POLICY "Club owners can insert event_groups"
  ON public.event_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_groups.event_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

-- Event groups RLS: club owners can update
CREATE POLICY "Club owners can update event_groups"
  ON public.event_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_groups.event_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

-- Event groups RLS: club owners can delete
CREATE POLICY "Club owners can delete event_groups"
  ON public.event_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_groups.event_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

-- Add indexes
CREATE INDEX idx_events_club_id ON public.events(club_id);
CREATE INDEX idx_event_groups_event_id ON public.event_groups(event_id);
CREATE INDEX idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX idx_tasks_event_group_id ON public.tasks(event_group_id);
