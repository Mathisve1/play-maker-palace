
-- Add error flagging columns to sepa_batch_items
ALTER TABLE public.sepa_batch_items 
ADD COLUMN IF NOT EXISTS error_flag boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS error_message text;
