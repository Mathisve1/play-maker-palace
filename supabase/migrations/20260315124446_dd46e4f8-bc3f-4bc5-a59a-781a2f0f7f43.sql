
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS action_type text,
  ADD COLUMN IF NOT EXISTS action_data jsonb;
