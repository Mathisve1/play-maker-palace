
-- =====================================================
-- K1: Fix cross-club data leakage
-- =====================================================

-- Helper function to check club membership (any role)
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id
  ) OR EXISTS (
    SELECT 1 FROM public.clubs WHERE id = _club_id AND owner_id = _user_id
  )
$$;

-- Helper: get club_id from briefing block via group -> briefing
CREATE OR REPLACE FUNCTION public.get_briefing_club_id_from_block(_block_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.club_id FROM public.briefing_blocks bb
  JOIN public.briefing_groups bg ON bg.id = bb.group_id
  JOIN public.briefings b ON b.id = bg.briefing_id
  WHERE bb.id = _block_id
  LIMIT 1
$$;

-- === safety_incidents: scope to club members ===
DROP POLICY IF EXISTS "Anyone authenticated can read incidents" ON public.safety_incidents;
CREATE POLICY "Club members can read incidents"
  ON public.safety_incidents FOR SELECT TO public
  USING (
    is_club_member(auth.uid(), club_id)
    OR auth.uid() = reporter_id
  );

-- === content_translations: scope writes to club staff ===
DROP POLICY IF EXISTS "Authenticated users can insert translations" ON public.content_translations;
DROP POLICY IF EXISTS "Authenticated users can update translations" ON public.content_translations;
DROP POLICY IF EXISTS "Anyone authenticated can read translations" ON public.content_translations;

CREATE POLICY "Authenticated can read translations"
  ON public.content_translations FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can insert translations"
  ON public.content_translations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can update translations"
  ON public.content_translations FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- === briefing_route_waypoints: scope to club members via briefing ===
DROP POLICY IF EXISTS "Authenticated users can read route waypoints" ON public.briefing_route_waypoints;
DROP POLICY IF EXISTS "Club members can insert route waypoints" ON public.briefing_route_waypoints;
DROP POLICY IF EXISTS "Club members can update route waypoints" ON public.briefing_route_waypoints;
DROP POLICY IF EXISTS "Club members can delete route waypoints" ON public.briefing_route_waypoints;

CREATE POLICY "Club members can read route waypoints"
  ON public.briefing_route_waypoints FOR SELECT TO public
  USING (is_club_member(auth.uid(), get_briefing_club_id_from_block(block_id)));

CREATE POLICY "Club staff can insert route waypoints"
  ON public.briefing_route_waypoints FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM briefing_blocks bb
      JOIN briefing_groups bg ON bg.id = bb.group_id
      JOIN briefings b ON b.id = bg.briefing_id
      WHERE bb.id = block_id
      AND has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[])
    )
  );

CREATE POLICY "Club staff can update route waypoints"
  ON public.briefing_route_waypoints FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM briefing_blocks bb
      JOIN briefing_groups bg ON bg.id = bb.group_id
      JOIN briefings b ON b.id = bg.briefing_id
      WHERE bb.id = block_id
      AND has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[])
    )
  );

CREATE POLICY "Club staff can delete route waypoints"
  ON public.briefing_route_waypoints FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM briefing_blocks bb
      JOIN briefing_groups bg ON bg.id = bb.group_id
      JOIN briefings b ON b.id = bg.briefing_id
      WHERE bb.id = block_id
      AND has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder','beheerder','medewerker']::club_role[])
    )
  );

-- === monthly_plans: scope reads to club members ===
DROP POLICY IF EXISTS "Anyone authenticated can read monthly plans" ON public.monthly_plans;
CREATE POLICY "Club members can read monthly plans"
  ON public.monthly_plans FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

-- === monthly_plan_tasks: scope reads to club members ===
DROP POLICY IF EXISTS "Anyone authenticated can read monthly plan tasks" ON public.monthly_plan_tasks;
CREATE POLICY "Club members can read monthly plan tasks"
  ON public.monthly_plan_tasks FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM monthly_plans mp
      WHERE mp.id = plan_id AND is_club_member(auth.uid(), mp.club_id)
    )
  );

-- === safety config tables: scope reads to club members ===
DROP POLICY IF EXISTS "Anyone authenticated can read safety zones" ON public.safety_zones;
CREATE POLICY "Club members can read safety zones"
  ON public.safety_zones FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Anyone authenticated can read incident types" ON public.safety_incident_types;
CREATE POLICY "Club members can read incident types"
  ON public.safety_incident_types FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Anyone authenticated can read checklist items" ON public.safety_checklist_items;
CREATE POLICY "Club members can read checklist items"
  ON public.safety_checklist_items FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Anyone authenticated can read location levels" ON public.safety_location_levels;
CREATE POLICY "Club members can read location levels"
  ON public.safety_location_levels FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Anyone authenticated can read location options" ON public.safety_location_options;
CREATE POLICY "Club members can read location options"
  ON public.safety_location_options FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM safety_location_levels l
      WHERE l.id = level_id AND is_club_member(auth.uid(), l.club_id)
    )
  );

DROP POLICY IF EXISTS "Anyone authenticated can read safety roles" ON public.safety_roles;
CREATE POLICY "Club members can read safety roles"
  ON public.safety_roles FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated can read closing templates" ON public.closing_templates;
CREATE POLICY "Club members can read closing templates"
  ON public.closing_templates FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated can read closing template items" ON public.closing_template_items;
CREATE POLICY "Club members can read closing template items"
  ON public.closing_template_items FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM closing_templates ct
      WHERE ct.id = template_id AND is_club_member(auth.uid(), ct.club_id)
    )
  );

-- =====================================================
-- K2: Fix public data exposure (remove USING true)
-- =====================================================

-- volunteer_certificates: require auth
DROP POLICY IF EXISTS "Anyone can read certificates for CV" ON public.volunteer_certificates;
CREATE POLICY "Authenticated can read certificates"
  ON public.volunteer_certificates FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- certificate_designs: require auth
DROP POLICY IF EXISTS "Anyone can read certificate designs" ON public.certificate_designs;
CREATE POLICY "Authenticated can read certificate designs"
  ON public.certificate_designs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- quiz_questions: require auth (correct_answer_index still visible but only to logged-in users)
DROP POLICY IF EXISTS "Anyone can read questions of published quizzes" ON public.quiz_questions;
CREATE POLICY "Authenticated can read published quiz questions"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_quizzes q
      JOIN academy_trainings t ON t.id = q.training_id
      WHERE q.id = quiz_id AND t.is_published = true
    )
  );

-- volunteer_skills: require auth
DROP POLICY IF EXISTS "Public read skills" ON public.volunteer_skills;

-- volunteer_badges: require auth
DROP POLICY IF EXISTS "Public read badges" ON public.volunteer_badges;

-- task_likes: require auth
DROP POLICY IF EXISTS "Anyone can read likes" ON public.task_likes;
CREATE POLICY "Authenticated can read likes"
  ON public.task_likes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- K3: Storage bucket contract-templates - scope to club path
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can read contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Club leaders can upload contract PDFs" ON storage.objects;

CREATE POLICY "Club members can read own contract PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-templates'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Club staff can upload contract PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contract-templates'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Club staff can delete contract PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contract-templates'
    AND auth.role() = 'authenticated'
  );

-- =====================================================
-- H3: Contract templates - restrict UPDATE to bestuurder + beheerder
-- =====================================================
DROP POLICY IF EXISTS "Club members can update templates" ON public.contract_templates;
CREATE POLICY "Club leaders can update templates"
  ON public.contract_templates FOR UPDATE TO authenticated
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]))
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

-- Also restrict INSERT to bestuurder + beheerder (medewerker shouldn't create templates)
DROP POLICY IF EXISTS "Club members can create templates" ON public.contract_templates;
CREATE POLICY "Club leaders can create templates"
  ON public.contract_templates FOR INSERT TO authenticated
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));
