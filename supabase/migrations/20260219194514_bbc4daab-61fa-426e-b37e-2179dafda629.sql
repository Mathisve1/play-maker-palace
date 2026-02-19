
-- Loyalty programs created by clubs
CREATE TABLE public.loyalty_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reward_description TEXT NOT NULL,
  required_tasks INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volunteer enrollments in loyalty programs
CREATE TABLE public.loyalty_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, volunteer_id)
);

-- Enable RLS
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_enrollments ENABLE ROW LEVEL SECURITY;

-- Loyalty programs policies
CREATE POLICY "Anyone can read active loyalty programs" ON public.loyalty_programs
  FOR SELECT USING (true);

CREATE POLICY "Club staff can insert loyalty programs" ON public.loyalty_programs
  FOR INSERT WITH CHECK (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND owner_id = auth.uid())
  );

CREATE POLICY "Club staff can update loyalty programs" ON public.loyalty_programs
  FOR UPDATE USING (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND owner_id = auth.uid())
  );

CREATE POLICY "Club staff can delete loyalty programs" ON public.loyalty_programs
  FOR DELETE USING (
    has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
    OR EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND owner_id = auth.uid())
  );

-- Loyalty enrollments policies
CREATE POLICY "Volunteers can read own enrollments" ON public.loyalty_enrollments
  FOR SELECT USING (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can enroll themselves" ON public.loyalty_enrollments
  FOR INSERT WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can update own enrollments" ON public.loyalty_enrollments
  FOR UPDATE USING (auth.uid() = volunteer_id);

CREATE POLICY "Club staff can read enrollments for their programs" ON public.loyalty_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loyalty_programs lp
      JOIN clubs c ON c.id = lp.club_id
      WHERE lp.id = loyalty_enrollments.program_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

CREATE POLICY "Club staff can update enrollments" ON public.loyalty_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM loyalty_programs lp
      JOIN clubs c ON c.id = lp.club_id
      WHERE lp.id = loyalty_enrollments.program_id
      AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_loyalty_enrollments_updated_at
  BEFORE UPDATE ON public.loyalty_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
