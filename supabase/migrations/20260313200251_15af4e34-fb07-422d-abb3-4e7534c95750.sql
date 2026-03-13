
-- Add waitlist_enabled to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN NOT NULL DEFAULT false;

-- Task waitlist table
CREATE TABLE public.task_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  volunteer_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  promoted_at TIMESTAMPTZ,
  UNIQUE (task_id, volunteer_id)
);

ALTER TABLE public.task_waitlist ENABLE ROW LEVEL SECURITY;

-- Volunteers can join/leave their own waitlist entries
CREATE POLICY "Users can manage own waitlist entries"
  ON public.task_waitlist FOR ALL
  TO authenticated
  USING (auth.uid() = volunteer_id)
  WITH CHECK (auth.uid() = volunteer_id);

-- Club owners can read waitlist for their tasks
CREATE POLICY "Club owners can read task waitlist"
  ON public.task_waitlist FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_waitlist.task_id AND c.owner_id = auth.uid()
  ));

-- Club owners can manage waitlist (manual promote/remove)
CREATE POLICY "Club owners can manage task waitlist"
  ON public.task_waitlist FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_waitlist.task_id AND c.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.clubs c ON c.id = t.club_id
    WHERE t.id = task_waitlist.task_id AND c.owner_id = auth.uid()
  ));
