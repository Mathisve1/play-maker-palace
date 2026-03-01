
-- Add is_live column to events table for GO LIVE functionality
ALTER TABLE public.events ADD COLUMN is_live boolean NOT NULL DEFAULT false;

-- Enable realtime on events table for GO LIVE detection
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
