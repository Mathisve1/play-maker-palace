
-- Add status column to task_signups to distinguish between signed up and assigned
ALTER TABLE public.task_signups 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.task_signups.status IS 'pending = ingeschreven, assigned = toegekend door club';
