
-- Add external_event_id to events table for Eventbrite auto-sync
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS external_event_id TEXT;

-- Add external_ticket_class_id to tasks table for Eventbrite ticket classes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS external_ticket_class_id TEXT;
