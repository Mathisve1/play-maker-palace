
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.regenerate_pos_api_key(p_club_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_new_key TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = p_club_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not the owner of this club';
  END IF;

  v_new_key := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.club_pos_settings (club_id, pos_api_key)
  VALUES (p_club_id, v_new_key)
  ON CONFLICT (club_id) DO UPDATE
    SET pos_api_key = v_new_key,
        updated_at  = NOW();

  RETURN v_new_key;
END;
$$;
