
-- Add hourly compensation fields to tasks
ALTER TABLE public.tasks
ADD COLUMN compensation_type text NOT NULL DEFAULT 'fixed',
ADD COLUMN hourly_rate numeric NULL,
ADD COLUMN estimated_hours numeric NULL;

-- Create hour_confirmations table for mutual hour approval
CREATE TABLE public.hour_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  volunteer_reported_hours numeric NULL,
  club_reported_hours numeric NULL,
  volunteer_approved boolean NOT NULL DEFAULT false,
  club_approved boolean NOT NULL DEFAULT false,
  final_hours numeric NULL,
  final_amount numeric NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hour_confirmations ENABLE ROW LEVEL SECURITY;

-- Volunteers can read and update their own confirmations
CREATE POLICY "Volunteers can read own hour confirmations"
ON public.hour_confirmations FOR SELECT
USING (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can update own hour confirmations"
ON public.hour_confirmations FOR UPDATE
USING (auth.uid() = volunteer_id);

-- Club owners/staff can read confirmations for their tasks
CREATE POLICY "Club staff can read hour confirmations"
ON public.hour_confirmations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN clubs c ON c.id = t.club_id
  WHERE t.id = hour_confirmations.task_id
  AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
));

-- Club owners/staff can insert confirmations
CREATE POLICY "Club staff can insert hour confirmations"
ON public.hour_confirmations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t JOIN clubs c ON c.id = t.club_id
  WHERE t.id = hour_confirmations.task_id
  AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
));

-- Club owners/staff can update confirmations for their tasks
CREATE POLICY "Club staff can update hour confirmations"
ON public.hour_confirmations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN clubs c ON c.id = t.club_id
  WHERE t.id = hour_confirmations.task_id
  AND (c.owner_id = auth.uid() OR has_club_role(auth.uid(), c.id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
));

-- Volunteers can also insert their own confirmations (for when volunteer submits first)
CREATE POLICY "Volunteers can insert own hour confirmations"
ON public.hour_confirmations FOR INSERT
WITH CHECK (auth.uid() = volunteer_id);

-- Trigger for updated_at
CREATE TRIGGER update_hour_confirmations_updated_at
BEFORE UPDATE ON public.hour_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
