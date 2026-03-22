-- ============================================================
-- Sponsor Hub v3: Self-Serve B2B Portal
-- Adds pending_payment workflow, contact columns, and secure
-- public RPCs so anonymous businesses can submit campaigns
-- without an authenticated session.
-- ============================================================

-- 1. Extend sponsor_campaign_status enum with pending_payment
--    (must be done outside a transaction block in practice;
--     Supabase runs each migration non-transactionally by default)
ALTER TYPE public.sponsor_campaign_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'draft';

-- 2. Extend sponsors table with optional contact info
ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS website       TEXT;

-- 3. Extend sponsor_campaigns with reward text + submitter email
ALTER TABLE public.sponsor_campaigns
  ADD COLUMN IF NOT EXISTS reward_text        TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by_email TEXT;

-- ── Public RPCs (SECURITY DEFINER — run as function owner, bypass RLS) ────────

-- 4. Return minimal public club info for the wizard header
CREATE OR REPLACE FUNCTION public.get_public_club_info(p_club_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object('id', c.id, 'name', c.name)
    INTO v_result
    FROM public.clubs c
   WHERE c.id = p_club_id
   LIMIT 1;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_club_info(UUID) TO anon, authenticated;

-- 5. Return upcoming tasks for a club (for wizard step 3 – task linking)
CREATE OR REPLACE FUNCTION public.get_public_club_tasks(p_club_id UUID)
RETURNS TABLE(
  id        UUID,
  title     TEXT,
  task_date DATE,
  status    TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.task_date, t.status
    FROM public.tasks t
   WHERE t.club_id = p_club_id
     AND t.status NOT IN ('cancelled', 'completed')
     AND (t.task_date IS NULL OR t.task_date >= CURRENT_DATE)
   ORDER BY t.task_date ASC NULLS LAST
   LIMIT 60;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_club_tasks(UUID) TO anon, authenticated;

-- 6. Atomic sponsor-application submission (anon-safe)
--    Creates: sponsor row + campaign row (pending_payment) + task links
--    Uses SECURITY DEFINER so no INSERT RLS is needed for anon users.
--    Input is validated: club must exist; empty strings treated as NULL.
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
  p_task_ids           TEXT[]  DEFAULT '{}'
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
  -- Guard: club must exist
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'Club not found: %', p_club_id;
  END IF;

  -- Guard: required fields
  IF NULLIF(TRIM(p_sponsor_name), '') IS NULL THEN
    RAISE EXCEPTION 'sponsor_name is required';
  END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'title is required';
  END IF;

  -- Insert sponsor
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

  -- Insert campaign as pending_payment
  INSERT INTO public.sponsor_campaigns (
    club_id, sponsor_id, campaign_type,
    title, description, reward_text,
    reward_value_cents, image_url,
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
    NULLIF(TRIM(p_contact_email), ''),
    'pending_payment'
  )
  RETURNING id INTO v_campaign_id;

  -- Link tasks if provided (local_coupon type)
  IF p_task_ids IS NOT NULL THEN
    FOREACH v_task_str IN ARRAY p_task_ids LOOP
      IF v_task_str IS NOT NULL AND TRIM(v_task_str) != '' THEN
        BEGIN
          INSERT INTO public.sponsor_campaign_tasks (campaign_id, task_id)
          VALUES (v_campaign_id, v_task_str::UUID)
          ON CONFLICT DO NOTHING;
        EXCEPTION WHEN invalid_text_representation THEN
          -- skip invalid UUIDs
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
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[]
) TO anon, authenticated;

-- 7. Allow club owners to approve pending campaigns
--    (The existing sponsor_campaigns_update policy already allows this
--     since owners can UPDATE any campaign in their club. No new policy needed.)

-- 8. RLS: allow anon SELECT on sponsor_campaigns for the portal preview
--    (Already covered by existing "OR auth.role() = 'anon'" clause — no change.)
