-- Migration: add thankyou_sent_at to task_signups
-- Used by the send-thankyou-push edge function to prevent duplicate thank-you messages

ALTER TABLE public.task_signups
  ADD COLUMN IF NOT EXISTS thankyou_sent_at TIMESTAMPTZ NULL;

-- Index for efficient querying of unsent thank-yous
CREATE INDEX IF NOT EXISTS idx_task_signups_thankyou
  ON public.task_signups (thankyou_sent_at)
  WHERE thankyou_sent_at IS NULL;
