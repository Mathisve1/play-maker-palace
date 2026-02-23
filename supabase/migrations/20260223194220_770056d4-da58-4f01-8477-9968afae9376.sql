
-- Academy Trainings
CREATE TABLE public.academy_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published trainings" ON public.academy_trainings FOR SELECT USING (is_published = true);
CREATE POLICY "Club staff can manage trainings" ON public.academy_trainings FOR ALL USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Training Modules
CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.academy_trainings(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'text',
  content_body text,
  content_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read modules of published trainings" ON public.training_modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.academy_trainings t WHERE t.id = training_modules.training_id AND t.is_published = true)
);
CREATE POLICY "Club staff can manage modules" ON public.training_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.academy_trainings t WHERE t.id = training_modules.training_id AND has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
);

-- Training Quizzes
CREATE TABLE public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL UNIQUE REFERENCES public.academy_trainings(id) ON DELETE CASCADE,
  passing_score integer NOT NULL DEFAULT 7,
  total_questions integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quizzes of published trainings" ON public.training_quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.academy_trainings t WHERE t.id = training_quizzes.training_id AND t.is_published = true)
);
CREATE POLICY "Club staff can manage quizzes" ON public.training_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.academy_trainings t WHERE t.id = training_quizzes.training_id AND has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
);

-- Quiz Questions
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer_index integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions of published quizzes" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.training_quizzes q JOIN public.academy_trainings t ON t.id = q.training_id WHERE q.id = quiz_questions.quiz_id AND t.is_published = true)
);
CREATE POLICY "Club staff can manage questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.training_quizzes q JOIN public.academy_trainings t ON t.id = q.training_id WHERE q.id = quiz_questions.quiz_id AND has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
);

-- Volunteer Certificates
CREATE TABLE public.volunteer_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL,
  training_id uuid NOT NULL REFERENCES public.academy_trainings(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  issue_date timestamptz NOT NULL DEFAULT now(),
  score integer,
  type text NOT NULL DEFAULT 'digital_quiz',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can read own certificates" ON public.volunteer_certificates FOR SELECT USING (auth.uid() = volunteer_id);
CREATE POLICY "Anyone can read certificates for CV" ON public.volunteer_certificates FOR SELECT USING (true);
CREATE POLICY "Volunteers can insert own certificates" ON public.volunteer_certificates FOR INSERT WITH CHECK (auth.uid() = volunteer_id);
CREATE POLICY "Club staff can manage certificates" ON public.volunteer_certificates FOR ALL USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
);

-- Add required_training_id to tasks
ALTER TABLE public.tasks ADD COLUMN required_training_id uuid REFERENCES public.academy_trainings(id) ON DELETE SET NULL;

-- Triggers for updated_at
CREATE TRIGGER update_academy_trainings_updated_at BEFORE UPDATE ON public.academy_trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
