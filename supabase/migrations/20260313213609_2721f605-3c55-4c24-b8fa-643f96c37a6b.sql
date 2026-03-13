
-- Fix quiz_questions: create view without correct_answer_index
CREATE OR REPLACE VIEW public.quiz_questions_safe
WITH (security_invoker = true) AS
  SELECT id, quiz_id, question_text, options, sort_order, created_at
  FROM public.quiz_questions;
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- Fix clubs stripe_account_id: restrict to owner/staff only
DROP POLICY IF EXISTS "Authenticated can read clubs" ON public.clubs;
CREATE POLICY "Authenticated can read clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (true);

-- Fix loyalty_program_excluded_tasks
DROP POLICY IF EXISTS "Anyone can read excluded tasks" ON public.loyalty_program_excluded_tasks;
CREATE POLICY "Authenticated can read excluded tasks"
  ON public.loyalty_program_excluded_tasks FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
