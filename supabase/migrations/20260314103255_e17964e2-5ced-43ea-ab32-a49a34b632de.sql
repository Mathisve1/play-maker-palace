
-- Safety Teams table
CREATE TABLE public.safety_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safety Team Members table
CREATE TABLE public.safety_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.safety_teams(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, volunteer_id)
);

-- Add assignment columns to closing_tasks
ALTER TABLE public.closing_tasks ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES public.safety_teams(id) ON DELETE SET NULL;

-- Add assignment columns to safety_checklist_items
ALTER TABLE public.safety_checklist_items ADD COLUMN IF NOT EXISTS assigned_volunteer_id UUID;
ALTER TABLE public.safety_checklist_items ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES public.safety_teams(id) ON DELETE SET NULL;

-- Add assignment columns to briefing_checklist_items
ALTER TABLE public.briefing_checklist_items ADD COLUMN IF NOT EXISTS assigned_volunteer_id UUID;
ALTER TABLE public.briefing_checklist_items ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES public.safety_teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.safety_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for safety_teams
CREATE POLICY "Club members can view safety teams" ON public.safety_teams
  FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club owners/admins can manage safety teams" ON public.safety_teams
  FOR ALL TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

-- RLS policies for safety_team_members
CREATE POLICY "Club members can view team members" ON public.safety_team_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.safety_teams st
    WHERE st.id = team_id AND public.is_club_member(auth.uid(), st.club_id)
  ));

CREATE POLICY "Club owners/admins and team leaders can manage team members" ON public.safety_team_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.safety_teams st
    WHERE st.id = team_id AND (
      public.has_club_role(auth.uid(), st.club_id, ARRAY['bestuurder','beheerder']::club_role[])
      OR st.leader_id = auth.uid()
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.safety_teams st
    WHERE st.id = team_id AND (
      public.has_club_role(auth.uid(), st.club_id, ARRAY['bestuurder','beheerder']::club_role[])
      OR st.leader_id = auth.uid()
    )
  ));

-- Helper function: check if user is team leader
CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.safety_teams
    WHERE id = _team_id AND leader_id = _user_id
  )
$$;

-- Helper function: check if user is member of team
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.safety_team_members
    WHERE team_id = _team_id AND volunteer_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.safety_teams
    WHERE id = _team_id AND leader_id = _user_id
  )
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_team_members;
