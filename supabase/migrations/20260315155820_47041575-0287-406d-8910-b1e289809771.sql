
CREATE TABLE IF NOT EXISTS public.club_required_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.academy_trainings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, training_id)
);

ALTER TABLE public.club_required_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read required trainings"
  ON public.club_required_trainings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Club admins can manage required trainings"
  ON public.club_required_trainings FOR ALL
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::public.club_role[]))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::public.club_role[]));
