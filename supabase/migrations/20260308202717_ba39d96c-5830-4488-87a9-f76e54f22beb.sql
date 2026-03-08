
-- Usage logs for API monitoring
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  api_key_id uuid NOT NULL REFERENCES public.club_api_keys(id) ON DELETE CASCADE,
  resource text NOT NULL,
  format text NOT NULL DEFAULT 'json',
  status_code integer NOT NULL DEFAULT 200,
  response_rows integer NOT NULL DEFAULT 0,
  duration_ms integer,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast club-scoped queries
CREATE INDEX idx_api_usage_logs_club_id ON public.api_usage_logs(club_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);
CREATE INDEX idx_api_usage_logs_api_key_id ON public.api_usage_logs(api_key_id);

-- RLS: club managers can read their own logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club managers can view usage logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, '{bestuurder,beheerder}'::club_role[]));
