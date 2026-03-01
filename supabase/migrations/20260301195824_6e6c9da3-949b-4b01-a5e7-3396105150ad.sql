-- Add event_group_id to safety_zones to link zones to event groups
ALTER TABLE public.safety_zones 
ADD COLUMN event_group_id uuid REFERENCES public.event_groups(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_safety_zones_event_group_id ON public.safety_zones(event_group_id);