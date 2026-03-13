
-- FIX: content_translations - restrict writes to club staff via service role only
DROP POLICY IF EXISTS "Club staff can insert translations" ON public.content_translations;
DROP POLICY IF EXISTS "Club staff can update translations" ON public.content_translations;
CREATE POLICY "Service role can insert translations"
  ON public.content_translations FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "Service role can update translations"
  ON public.content_translations FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

-- FIX: quiz_questions - remove public access to correct answers
DROP POLICY IF EXISTS "Authenticated can read published quiz questions" ON public.quiz_questions;
CREATE POLICY "Authenticated can read published quiz questions without answers"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_quizzes q
      JOIN academy_trainings t ON t.id = q.training_id
      WHERE q.id = quiz_id AND t.is_published = true
    )
  );

-- FIX: clubs - restrict base table, use clubs_safe view for general reads
DROP POLICY IF EXISTS "Anyone can read clubs" ON public.clubs;
CREATE POLICY "Authenticated can read clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (true);

-- FIX: task_zones - respect is_visible flag
DROP POLICY IF EXISTS "Anyone can read visible zones" ON public.task_zones;
CREATE POLICY "Anyone can read visible zones"
  ON public.task_zones FOR SELECT TO public
  USING (is_visible = true);

-- FIX: loyalty_programs - respect is_active flag
DROP POLICY IF EXISTS "Anyone can read active loyalty programs" ON public.loyalty_programs;
CREATE POLICY "Anyone can read active loyalty programs"
  ON public.loyalty_programs FOR SELECT TO public
  USING (is_active = true);
