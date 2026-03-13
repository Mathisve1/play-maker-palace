
-- Add allow_shift_swaps setting to clubs
ALTER TABLE public.clubs ADD COLUMN allow_shift_swaps BOOLEAN NOT NULL DEFAULT false;

-- Shift swap requests table
CREATE TABLE public.shift_swaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_target',
  reason TEXT,
  target_responded_at TIMESTAMP WITH TIME ZONE,
  club_approved_at TIMESTAMP WITH TIME ZONE,
  club_approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;

-- Volunteers can see their own swaps
CREATE POLICY "Volunteers see own swaps"
  ON public.shift_swaps FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());

-- Club owners/managers can see all swaps for their club
CREATE POLICY "Club managers see club swaps"
  ON public.shift_swaps FOR SELECT TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

-- Volunteers can create swap requests
CREATE POLICY "Volunteers can create swaps"
  ON public.shift_swaps FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Involved parties can update swaps
CREATE POLICY "Participants can update swaps"
  ON public.shift_swaps FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid() OR public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

-- Updated_at trigger
CREATE TRIGGER update_shift_swaps_updated_at
  BEFORE UPDATE ON public.shift_swaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
