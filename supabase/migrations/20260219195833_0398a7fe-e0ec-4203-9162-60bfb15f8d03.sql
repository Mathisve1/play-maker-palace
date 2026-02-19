
-- Add points and loyalty eligibility to tasks
ALTER TABLE public.tasks ADD COLUMN loyalty_points integer DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN loyalty_eligible boolean NOT NULL DEFAULT true;

-- Update loyalty_programs to support points-based system
ALTER TABLE public.loyalty_programs ADD COLUMN required_points integer DEFAULT NULL;
ALTER TABLE public.loyalty_programs ADD COLUMN points_based boolean NOT NULL DEFAULT false;

-- Add points tracking to enrollments
ALTER TABLE public.loyalty_enrollments ADD COLUMN points_earned integer NOT NULL DEFAULT 0;

-- Table for per-program task exclusions
CREATE TABLE public.loyalty_program_excluded_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(program_id, task_id)
);

ALTER TABLE public.loyalty_program_excluded_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read excluded tasks" ON public.loyalty_program_excluded_tasks
  FOR SELECT USING (true);

CREATE POLICY "Club staff can manage excluded tasks" ON public.loyalty_program_excluded_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loyalty_programs lp JOIN clubs c ON c.id = lp.club_id
      WHERE lp.id = loyalty_program_excluded_tasks.program_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

CREATE POLICY "Club staff can delete excluded tasks" ON public.loyalty_program_excluded_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM loyalty_programs lp JOIN clubs c ON c.id = lp.club_id
      WHERE lp.id = loyalty_program_excluded_tasks.program_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );
