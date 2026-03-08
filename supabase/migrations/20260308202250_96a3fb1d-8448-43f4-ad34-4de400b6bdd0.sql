
-- Table for club API keys
CREATE TABLE public.club_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  api_key text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  key_prefix text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT 'API Key',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  calls_this_hour integer NOT NULL DEFAULT 0,
  hour_window_start timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-set key_prefix from api_key
CREATE OR REPLACE FUNCTION public.set_api_key_prefix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.key_prefix := left(NEW.api_key, 8);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_api_key_prefix
  BEFORE INSERT ON public.club_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_api_key_prefix();

-- RLS
ALTER TABLE public.club_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club managers can view own keys"
  ON public.club_api_keys FOR SELECT
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, '{bestuurder,beheerder}'::club_role[]));

CREATE POLICY "Club managers can insert keys"
  ON public.club_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (public.has_club_role(auth.uid(), club_id, '{bestuurder,beheerder}'::club_role[]));

CREATE POLICY "Club managers can update keys"
  ON public.club_api_keys FOR UPDATE
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, '{bestuurder,beheerder}'::club_role[]));

CREATE POLICY "Club managers can delete keys"
  ON public.club_api_keys FOR DELETE
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, '{bestuurder,beheerder}'::club_role[]));
