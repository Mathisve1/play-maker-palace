-- 1. Club-level herbruikbare safety zones
CREATE TABLE public.club_safety_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_description text,
  color text NOT NULL DEFAULT '#3b82f6',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_safety_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view club safety zones"
  ON public.club_safety_zones FOR SELECT
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can insert club safety zones"
  ON public.club_safety_zones FOR INSERT
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

CREATE POLICY "Club admins can update club safety zones"
  ON public.club_safety_zones FOR UPDATE
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

CREATE POLICY "Club admins can delete club safety zones"
  ON public.club_safety_zones FOR DELETE
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

CREATE TRIGGER trg_club_safety_zones_updated_at
  BEFORE UPDATE ON public.club_safety_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_club_safety_zones_club ON public.club_safety_zones(club_id);

-- 2. Koppel safety_teams ↔ club_safety_zones
CREATE TABLE public.safety_team_club_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.safety_teams(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.club_safety_zones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, zone_id)
);

ALTER TABLE public.safety_team_club_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view team club zones"
  ON public.safety_team_club_zones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.safety_teams st
    WHERE st.id = safety_team_club_zones.team_id
      AND public.is_club_member(auth.uid(), st.club_id)
  ));

CREATE POLICY "Admins manage team club zones"
  ON public.safety_team_club_zones FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.safety_teams st
    WHERE st.id = safety_team_club_zones.team_id
      AND public.has_club_role(auth.uid(), st.club_id, ARRAY['bestuurder','beheerder']::club_role[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.safety_teams st
    WHERE st.id = safety_team_club_zones.team_id
      AND public.has_club_role(auth.uid(), st.club_id, ARRAY['bestuurder','beheerder']::club_role[])
  ));

CREATE INDEX idx_stcz_team ON public.safety_team_club_zones(team_id);
CREATE INDEX idx_stcz_zone ON public.safety_team_club_zones(zone_id);

-- 3. Koppel briefing_groups ↔ safety_teams
CREATE TABLE public.briefing_group_safety_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.briefing_groups(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.safety_teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, team_id)
);

ALTER TABLE public.briefing_group_safety_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view briefing group teams"
  ON public.briefing_group_safety_teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.briefing_groups bg
    JOIN public.briefings b ON b.id = bg.briefing_id
    WHERE bg.id = briefing_group_safety_teams.group_id
      AND public.is_club_member(auth.uid(), b.club_id)
  ));

CREATE POLICY "Admins manage briefing group teams"
  ON public.briefing_group_safety_teams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.briefing_groups bg
    JOIN public.briefings b ON b.id = bg.briefing_id
    WHERE bg.id = briefing_group_safety_teams.group_id
      AND public.has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder']::club_role[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.briefing_groups bg
    JOIN public.briefings b ON b.id = bg.briefing_id
    WHERE bg.id = briefing_group_safety_teams.group_id
      AND public.has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder']::club_role[])
  ));

CREATE INDEX idx_bgst_group ON public.briefing_group_safety_teams(group_id);
CREATE INDEX idx_bgst_team ON public.briefing_group_safety_teams(team_id);

-- 4. Koppel briefing_groups ↔ club_safety_zones
CREATE TABLE public.briefing_group_club_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.briefing_groups(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.club_safety_zones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, zone_id)
);

ALTER TABLE public.briefing_group_club_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view briefing group zones"
  ON public.briefing_group_club_zones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.briefing_groups bg
    JOIN public.briefings b ON b.id = bg.briefing_id
    WHERE bg.id = briefing_group_club_zones.group_id
      AND public.is_club_member(auth.uid(), b.club_id)
  ));

CREATE POLICY "Admins manage briefing group zones"
  ON public.briefing_group_club_zones FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.briefing_groups bg
    JOIN public.briefings b ON b.id = bg.briefing_id
    WHERE bg.id = briefing_group_club_zones.group_id
      AND public.has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder']::club_role[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.briefing_groups bg
    JOIN public.briefings b ON b.id = bg.briefing_id
    WHERE bg.id = briefing_group_club_zones.group_id
      AND public.has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder']::club_role[])
  ));

CREATE INDEX idx_bgcz_group ON public.briefing_group_club_zones(group_id);
CREATE INDEX idx_bgcz_zone ON public.briefing_group_club_zones(zone_id);

-- 5. Uitbreidingen briefing_groups
ALTER TABLE public.briefing_groups
  ADD COLUMN IF NOT EXISTS leader_id uuid,
  ADD COLUMN IF NOT EXISTS closing_template_id uuid REFERENCES public.closing_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS briefing_time text,
  ADD COLUMN IF NOT EXISTS briefing_location text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS required_training_id uuid REFERENCES public.academy_trainings(id) ON DELETE SET NULL;