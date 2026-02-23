ALTER TABLE public.events ADD COLUMN event_type text NOT NULL DEFAULT 'event';

-- Mark existing events that have a training_id as training events
UPDATE public.events SET event_type = 'training' WHERE training_id IS NOT NULL;