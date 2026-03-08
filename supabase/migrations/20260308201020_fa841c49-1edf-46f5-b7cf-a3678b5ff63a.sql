
ALTER TABLE public.partner_task_assignments 
ADD COLUMN checked_in_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN checked_out_at TIMESTAMPTZ DEFAULT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_task_assignments;
