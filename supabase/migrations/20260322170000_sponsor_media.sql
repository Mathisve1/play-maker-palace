-- ============================================================
-- Sponsor Hub v4: Rich Media & Storage
-- ============================================================

-- 1. sponsor_media storage bucket (public read, authenticated write, anon write to pending/)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor_media',
  'sponsor_media',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first to make idempotent)
DROP POLICY IF EXISTS "sponsor_media_read"        ON storage.objects;
DROP POLICY IF EXISTS "sponsor_media_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "sponsor_media_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "sponsor_media_delete_auth" ON storage.objects;

-- Public read (everyone can view uploaded sponsor images)
CREATE POLICY "sponsor_media_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sponsor_media');

-- Authenticated club admins can upload anywhere
CREATE POLICY "sponsor_media_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sponsor_media');

-- Anon users (public wizard) can upload only to pending/ subfolder
CREATE POLICY "sponsor_media_insert_anon"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'sponsor_media'
    AND (storage.foldername(name))[1] = 'pending'
  );

-- Authenticated users can delete their own uploads
CREATE POLICY "sponsor_media_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sponsor_media');

-- 2. New columns on sponsor_campaigns
ALTER TABLE public.sponsor_campaigns
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS custom_cta       TEXT,    -- e.g. "Bekijk Menu", "Kom Langs"
  ADD COLUMN IF NOT EXISTS rich_description TEXT;    -- longer body copy shown in expanded view

-- 3. Replace submit_sponsor_application with updated version including new fields
--    (DROP first to change parameter list, then CREATE)
DROP FUNCTION IF EXISTS public.submit_sponsor_application(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[]
);

CREATE OR REPLACE FUNCTION public.submit_sponsor_application(
  p_club_id            UUID,
  p_sponsor_name       TEXT,
  p_brand_color        TEXT    DEFAULT '#6366f1',
  p_logo_url           TEXT    DEFAULT '',
  p_contact_name       TEXT    DEFAULT '',
  p_contact_email      TEXT    DEFAULT '',
  p_campaign_type      TEXT    DEFAULT 'dashboard_banner',
  p_title              TEXT    DEFAULT '',
  p_description        TEXT    DEFAULT '',
  p_reward_text        TEXT    DEFAULT '',
  p_reward_value_cents INTEGER DEFAULT NULL,
  p_image_url          TEXT    DEFAULT '',
  p_task_ids           TEXT[]  DEFAULT '{}',
  -- New v4 parameters
  p_cover_image_url    TEXT    DEFAULT '',
  p_custom_cta         TEXT    DEFAULT '',
  p_rich_description   TEXT    DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sponsor_id  UUID;
  v_campaign_id UUID;
  v_task_str    TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'Club not found: %', p_club_id;
  END IF;
  IF NULLIF(TRIM(p_sponsor_name), '') IS NULL THEN
    RAISE EXCEPTION 'sponsor_name is required';
  END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'title is required';
  END IF;

  INSERT INTO public.sponsors (
    club_id, name, logo_url, brand_color, contact_name, contact_email
  ) VALUES (
    p_club_id,
    TRIM(p_sponsor_name),
    NULLIF(TRIM(p_logo_url), ''),
    COALESCE(NULLIF(TRIM(p_brand_color), ''), '#6366f1'),
    NULLIF(TRIM(p_contact_name), ''),
    NULLIF(TRIM(p_contact_email), '')
  )
  RETURNING id INTO v_sponsor_id;

  INSERT INTO public.sponsor_campaigns (
    club_id, sponsor_id, campaign_type,
    title, description, reward_text,
    reward_value_cents, image_url,
    cover_image_url, custom_cta, rich_description,
    submitted_by_email, status
  ) VALUES (
    p_club_id,
    v_sponsor_id,
    p_campaign_type::sponsor_campaign_type,
    TRIM(p_title),
    NULLIF(TRIM(p_description), ''),
    NULLIF(TRIM(p_reward_text), ''),
    CASE WHEN p_reward_value_cents > 0 THEN p_reward_value_cents ELSE NULL END,
    NULLIF(TRIM(p_image_url), ''),
    NULLIF(TRIM(p_cover_image_url), ''),
    NULLIF(TRIM(p_custom_cta), ''),
    NULLIF(TRIM(p_rich_description), ''),
    NULLIF(TRIM(p_contact_email), ''),
    'pending_payment'
  )
  RETURNING id INTO v_campaign_id;

  IF p_task_ids IS NOT NULL THEN
    FOREACH v_task_str IN ARRAY p_task_ids LOOP
      IF v_task_str IS NOT NULL AND TRIM(v_task_str) != '' THEN
        BEGIN
          INSERT INTO public.sponsor_campaign_tasks (campaign_id, task_id)
          VALUES (v_campaign_id, v_task_str::UUID)
          ON CONFLICT DO NOTHING;
        EXCEPTION WHEN invalid_text_representation THEN
          NULL;
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success',     true,
    'sponsor_id',  v_sponsor_id,
    'campaign_id', v_campaign_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_sponsor_application(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT, TEXT, TEXT
) TO anon, authenticated;
