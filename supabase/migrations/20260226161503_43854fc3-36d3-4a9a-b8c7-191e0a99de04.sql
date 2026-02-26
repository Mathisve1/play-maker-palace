
-- Add partner acceptance status to tasks
ALTER TABLE public.tasks 
ADD COLUMN partner_acceptance_status text NOT NULL DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.partner_acceptance_status IS 'Status of partner acceptance: pending, accepted, rejected';
