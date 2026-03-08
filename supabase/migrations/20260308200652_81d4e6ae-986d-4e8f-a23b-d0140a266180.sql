
CREATE TABLE public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminder_logs_lookup ON public.reminder_logs (user_id, reminder_type, reference_id);
CREATE INDEX idx_reminder_logs_sent ON public.reminder_logs (sent_at);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.reminder_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
