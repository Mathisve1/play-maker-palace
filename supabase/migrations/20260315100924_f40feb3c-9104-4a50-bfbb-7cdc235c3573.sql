
-- Create volunteer_availability table
CREATE TABLE public.volunteer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_recurring boolean NOT NULL DEFAULT true,
  specific_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, day_of_week, start_time)
);

-- Enable RLS
ALTER TABLE public.volunteer_availability ENABLE ROW LEVEL SECURITY;

-- Volunteers can manage their own availability
CREATE POLICY "Users can view own availability"
  ON public.volunteer_availability FOR SELECT
  TO authenticated
  USING (volunteer_id = auth.uid());

CREATE POLICY "Users can insert own availability"
  ON public.volunteer_availability FOR INSERT
  TO authenticated
  WITH CHECK (volunteer_id = auth.uid());

CREATE POLICY "Users can update own availability"
  ON public.volunteer_availability FOR UPDATE
  TO authenticated
  USING (volunteer_id = auth.uid());

CREATE POLICY "Users can delete own availability"
  ON public.volunteer_availability FOR DELETE
  TO authenticated
  USING (volunteer_id = auth.uid());

-- Club members can view volunteer availability (for matching)
CREATE POLICY "Club members can view volunteer availability"
  ON public.volunteer_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.volunteer_id = public.volunteer_availability.volunteer_id
        AND public.is_club_member(auth.uid(), cm.club_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE public.is_club_member(auth.uid(), c.id)
    )
  );
