
-- Briefings linked to a task
CREATE TABLE public.briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Groups/roles within a briefing (e.g. 'Bar', 'Security', 'Algemeen')
CREATE TABLE public.briefing_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Algemeen',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Block types: time_slot, instruction, pause, checklist, emergency_contact
CREATE TABLE public.briefing_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.briefing_groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('time_slot', 'instruction', 'pause', 'checklist', 'emergency_contact')),
  sort_order INT NOT NULL DEFAULT 0,
  -- time_slot / pause fields
  start_time TEXT,
  end_time TEXT,
  duration_minutes INT,
  location TEXT,
  -- instruction fields
  title TEXT,
  description TEXT,
  -- emergency_contact fields
  contact_name TEXT,
  contact_phone TEXT,
  contact_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist items within a checklist block
CREATE TABLE public.briefing_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES public.briefing_blocks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Volunteer progress on checklist items
CREATE TABLE public.briefing_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id UUID NOT NULL REFERENCES public.briefing_checklist_items(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checklist_item_id, volunteer_id)
);

-- Volunteer group assignments
CREATE TABLE public.briefing_group_volunteers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.briefing_groups(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, volunteer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_group_volunteers ENABLE ROW LEVEL SECURITY;

-- Briefings policies
CREATE POLICY "Club members can read briefings" ON public.briefings FOR SELECT
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

CREATE POLICY "Volunteers can read briefings for their tasks" ON public.briefings FOR SELECT
  USING (EXISTS (SELECT 1 FROM task_signups ts WHERE ts.task_id = briefings.task_id AND ts.volunteer_id = auth.uid()));

CREATE POLICY "Club leaders can manage briefings" ON public.briefings FOR INSERT
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club leaders can update briefings" ON public.briefings FOR UPDATE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club leaders can delete briefings" ON public.briefings FOR DELETE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Groups policies (via briefing -> club)
CREATE POLICY "Read groups via briefing" ON public.briefing_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND (
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
    OR EXISTS (SELECT 1 FROM task_signups ts WHERE ts.task_id = b.task_id AND ts.volunteer_id = auth.uid())
  )));

CREATE POLICY "Manage groups via briefing" ON public.briefing_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Update groups via briefing" ON public.briefing_groups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Delete groups via briefing" ON public.briefing_groups FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

-- Blocks policies (via group -> briefing -> club)
CREATE POLICY "Read blocks via group" ON public.briefing_blocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND (
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
    OR EXISTS (SELECT 1 FROM task_signups ts WHERE ts.task_id = b.task_id AND ts.volunteer_id = auth.uid())
  )));

CREATE POLICY "Manage blocks via group" ON public.briefing_blocks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Update blocks via group" ON public.briefing_blocks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Delete blocks via group" ON public.briefing_blocks FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

-- Checklist items policies
CREATE POLICY "Read checklist items" ON public.briefing_checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND (
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
    OR EXISTS (SELECT 1 FROM task_signups ts WHERE ts.task_id = b.task_id AND ts.volunteer_id = auth.uid())
  )));

CREATE POLICY "Manage checklist items" ON public.briefing_checklist_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Update checklist items" ON public.briefing_checklist_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Delete checklist items" ON public.briefing_checklist_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

-- Checklist progress policies
CREATE POLICY "Volunteers can manage own progress" ON public.briefing_checklist_progress FOR ALL
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Club leaders can read progress" ON public.briefing_checklist_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM briefing_checklist_items ci
    JOIN briefing_blocks bl ON bl.id = ci.block_id
    JOIN briefing_groups g ON g.id = bl.group_id
    JOIN briefings b ON b.id = g.briefing_id
    WHERE ci.id = checklist_item_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

-- Group volunteers policies
CREATE POLICY "Read group volunteers" ON public.briefing_group_volunteers FOR SELECT
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND (
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
    OR auth.uid() = volunteer_id
  )));

CREATE POLICY "Manage group volunteers" ON public.briefing_group_volunteers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

CREATE POLICY "Delete group volunteers" ON public.briefing_group_volunteers FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])));

-- Triggers for updated_at
CREATE TRIGGER update_briefings_updated_at BEFORE UPDATE ON public.briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.briefing_checklist_progress;
