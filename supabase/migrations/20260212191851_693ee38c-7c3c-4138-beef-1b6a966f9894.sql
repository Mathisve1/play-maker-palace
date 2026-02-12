
-- Create table for route waypoints (linked to briefing_blocks of type 'route')
CREATE TABLE public.briefing_route_waypoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES public.briefing_blocks(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  arrival_time TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefing_route_waypoints ENABLE ROW LEVEL SECURITY;

-- Policies: club owners/admins can manage via briefing chain, volunteers can read
CREATE POLICY "Authenticated users can read route waypoints"
  ON public.briefing_route_waypoints FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club members can insert route waypoints"
  ON public.briefing_route_waypoints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Club members can update route waypoints"
  ON public.briefing_route_waypoints FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club members can delete route waypoints"
  ON public.briefing_route_waypoints FOR DELETE
  USING (auth.uid() IS NOT NULL);
