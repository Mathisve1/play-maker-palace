CREATE TABLE public.event_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'maybe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, task_id),
  UNIQUE (volunteer_id, event_id)
);

ALTER TABLE public.event_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own event availability"
ON public.event_availability FOR ALL
TO authenticated
USING (volunteer_id = auth.uid())
WITH CHECK (volunteer_id = auth.uid());

CREATE POLICY "Club owners can view event availability"
ON public.event_availability FOR SELECT
TO authenticated
USING (
  task_id IN (SELECT id FROM public.tasks WHERE club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
  OR event_id IN (SELECT id FROM public.events WHERE club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid()))
);