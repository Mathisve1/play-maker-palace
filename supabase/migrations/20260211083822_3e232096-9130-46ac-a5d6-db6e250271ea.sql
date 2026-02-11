
-- Add detail columns to tasks
ALTER TABLE public.tasks
ADD COLUMN expense_reimbursement boolean NOT NULL DEFAULT false,
ADD COLUMN expense_amount numeric(10,2) DEFAULT NULL,
ADD COLUMN briefing_time timestamp with time zone DEFAULT NULL,
ADD COLUMN briefing_location text DEFAULT NULL,
ADD COLUMN start_time timestamp with time zone DEFAULT NULL,
ADD COLUMN end_time timestamp with time zone DEFAULT NULL,
ADD COLUMN notes text DEFAULT NULL;
