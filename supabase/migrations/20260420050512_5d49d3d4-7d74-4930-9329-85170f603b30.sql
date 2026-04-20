
-- 1) Voeg extra velden toe aan event_groups
ALTER TABLE public.event_groups
  ADD COLUMN IF NOT EXISTS leader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closing_template_id uuid REFERENCES public.closing_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS briefing_time time,
  ADD COLUMN IF NOT EXISTS briefing_location text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS required_training_id uuid REFERENCES public.academy_trainings(id) ON DELETE SET NULL;

-- 2) Koppeltabel: event-groep ↔ safety teams (multi-select)
CREATE TABLE IF NOT EXISTS public.event_group_safety_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_group_id uuid NOT NULL REFERENCES public.event_groups(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.safety_teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_group_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_event_group_safety_teams_group ON public.event_group_safety_teams(event_group_id);
CREATE INDEX IF NOT EXISTS idx_event_group_safety_teams_team  ON public.event_group_safety_teams(team_id);

ALTER TABLE public.event_group_safety_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can read egst"
  ON public.event_group_safety_teams FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON e.id = eg.event_id
      WHERE eg.id = event_group_safety_teams.event_group_id
        AND public.is_club_member(auth.uid(), e.club_id)
    )
  );

CREATE POLICY "Club staff can manage egst"
  ON public.event_group_safety_teams FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON e.id = eg.event_id
      JOIN public.clubs c ON c.id = e.club_id
      WHERE eg.id = event_group_safety_teams.event_group_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON e.id = eg.event_id
      JOIN public.clubs c ON c.id = e.club_id
      WHERE eg.id = event_group_safety_teams.event_group_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

-- 3) Koppeltabel: event-groep ↔ club_safety_zones (herbruikbare zones)
CREATE TABLE IF NOT EXISTS public.event_group_club_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_group_id uuid NOT NULL REFERENCES public.event_groups(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.club_safety_zones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_group_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_egcz_group ON public.event_group_club_zones(event_group_id);
CREATE INDEX IF NOT EXISTS idx_egcz_zone  ON public.event_group_club_zones(zone_id);

ALTER TABLE public.event_group_club_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can read egcz"
  ON public.event_group_club_zones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON e.id = eg.event_id
      WHERE eg.id = event_group_club_zones.event_group_id
        AND public.is_club_member(auth.uid(), e.club_id)
    )
  );

CREATE POLICY "Club staff can manage egcz"
  ON public.event_group_club_zones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON e.id = eg.event_id
      JOIN public.clubs c ON c.id = e.club_id
      WHERE eg.id = event_group_club_zones.event_group_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON e.id = eg.event_id
      JOIN public.clubs c ON c.id = e.club_id
      WHERE eg.id = event_group_club_zones.event_group_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );
