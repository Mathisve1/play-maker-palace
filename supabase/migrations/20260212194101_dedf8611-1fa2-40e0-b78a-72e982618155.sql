
-- Fix: Allow 'route' and 'custom' block types
ALTER TABLE public.briefing_blocks DROP CONSTRAINT IF EXISTS briefing_blocks_type_check;
ALTER TABLE public.briefing_blocks ADD CONSTRAINT briefing_blocks_type_check 
  CHECK (type IN ('time_slot', 'instruction', 'pause', 'checklist', 'emergency_contact', 'route', 'custom'));

-- Fix: Allow medewerker to manage briefings (INSERT, UPDATE, DELETE)
-- Briefings table
DROP POLICY IF EXISTS "Club leaders can manage briefings" ON public.briefings;
CREATE POLICY "Club members can manage briefings" ON public.briefings FOR INSERT
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

DROP POLICY IF EXISTS "Club leaders can update briefings" ON public.briefings;
CREATE POLICY "Club members can update briefings" ON public.briefings FOR UPDATE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

DROP POLICY IF EXISTS "Club leaders can delete briefings" ON public.briefings;
CREATE POLICY "Club members can delete briefings" ON public.briefings FOR DELETE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

-- Groups table
DROP POLICY IF EXISTS "Manage groups via briefing" ON public.briefing_groups;
CREATE POLICY "Manage groups via briefing" ON public.briefing_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Update groups via briefing" ON public.briefing_groups;
CREATE POLICY "Update groups via briefing" ON public.briefing_groups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Delete groups via briefing" ON public.briefing_groups;
CREATE POLICY "Delete groups via briefing" ON public.briefing_groups FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefings b WHERE b.id = briefing_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

-- Blocks table
DROP POLICY IF EXISTS "Manage blocks via group" ON public.briefing_blocks;
CREATE POLICY "Manage blocks via group" ON public.briefing_blocks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Update blocks via group" ON public.briefing_blocks;
CREATE POLICY "Update blocks via group" ON public.briefing_blocks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Delete blocks via group" ON public.briefing_blocks;
CREATE POLICY "Delete blocks via group" ON public.briefing_blocks FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

-- Checklist items table
DROP POLICY IF EXISTS "Manage checklist items" ON public.briefing_checklist_items;
CREATE POLICY "Manage checklist items" ON public.briefing_checklist_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Update checklist items" ON public.briefing_checklist_items;
CREATE POLICY "Update checklist items" ON public.briefing_checklist_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Delete checklist items" ON public.briefing_checklist_items;
CREATE POLICY "Delete checklist items" ON public.briefing_checklist_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefing_blocks bl JOIN briefing_groups g ON g.id = bl.group_id JOIN briefings b ON b.id = g.briefing_id WHERE bl.id = block_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

-- Group volunteers table
DROP POLICY IF EXISTS "Manage group volunteers" ON public.briefing_group_volunteers;
CREATE POLICY "Manage group volunteers" ON public.briefing_group_volunteers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

DROP POLICY IF EXISTS "Delete group volunteers" ON public.briefing_group_volunteers;
CREATE POLICY "Delete group volunteers" ON public.briefing_group_volunteers FOR DELETE
  USING (EXISTS (SELECT 1 FROM briefing_groups g JOIN briefings b ON b.id = g.briefing_id WHERE g.id = group_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])));

-- Also allow medewerker to read checklist progress
DROP POLICY IF EXISTS "Club leaders can read progress" ON public.briefing_checklist_progress;
CREATE POLICY "Club members can read progress" ON public.briefing_checklist_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM briefing_checklist_items ci
    JOIN briefing_blocks bl ON bl.id = ci.block_id
    JOIN briefing_groups g ON g.id = bl.group_id
    JOIN briefings b ON b.id = g.briefing_id
    WHERE ci.id = checklist_item_id AND
    has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
  ));
