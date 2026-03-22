CREATE OR REPLACE FUNCTION public.submit_sponsor_application(p_club_id uuid, p_sponsor_name text, p_brand_color text DEFAULT '#6366f1'::text, p_logo_url text DEFAULT ''::text, p_contact_name text DEFAULT ''::text, p_contact_email text DEFAULT ''::text, p_campaign_type text DEFAULT 'dashboard_banner'::text, p_title text DEFAULT ''::text, p_description text DEFAULT ''::text, p_reward_text text DEFAULT ''::text, p_reward_value_cents integer DEFAULT NULL::integer, p_image_url text DEFAULT ''::text, p_task_ids text[] DEFAULT '{}'::text[], p_cover_image_url text DEFAULT ''::text, p_custom_cta text DEFAULT ''::text, p_rich_description text DEFAULT ''::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    reward_value_cents, cover_image_url,
    custom_cta, rich_description,
    submitted_by_email, status
  ) VALUES (
    p_club_id,
    v_sponsor_id,
    p_campaign_type::sponsor_campaign_type,
    TRIM(p_title),
    NULLIF(TRIM(p_description), ''),
    NULLIF(TRIM(p_reward_text), ''),
    CASE WHEN p_reward_value_cents > 0 THEN p_reward_value_cents ELSE NULL END,
    COALESCE(NULLIF(TRIM(p_cover_image_url), ''), NULLIF(TRIM(p_image_url), '')),
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
$function$;