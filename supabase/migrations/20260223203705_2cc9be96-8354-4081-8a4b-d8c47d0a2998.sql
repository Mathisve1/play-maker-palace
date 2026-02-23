
-- Add training_id to events table to link events to academy trainings (physical training events)
ALTER TABLE public.events ADD COLUMN training_id uuid REFERENCES public.academy_trainings(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX idx_events_training_id ON public.events(training_id) WHERE training_id IS NOT NULL;
