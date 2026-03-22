
-- 1. Add coupon validity config to campaigns
ALTER TABLE public.sponsor_campaigns
  ADD COLUMN IF NOT EXISTS coupon_validity_days INTEGER NOT NULL DEFAULT 30;

-- 2. Add expires_at to volunteer_coupons
ALTER TABLE public.volunteer_coupons
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Update validate_and_redeem_coupon to check expiry
CREATE OR REPLACE FUNCTION public.validate_and_redeem_coupon(
  p_code         TEXT,
  p_portal_token UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign  RECORD;
  v_coupon    RECORD;
BEGIN
  SELECT id, title, reward_value_cents, reward_text, status
    INTO v_campaign
    FROM public.sponsor_campaigns
   WHERE portal_access_token = p_portal_token
   LIMIT 1;

  IF v_campaign IS NULL THEN
    RETURN json_build_object(
      'success', false, 'error', 'invalid_portal_token',
      'message', 'Ongeldige portaal-link. Neem contact op met de club.'
    );
  END IF;

  IF v_campaign.status <> 'active' THEN
    RETURN json_build_object(
      'success', false, 'error', 'campaign_inactive',
      'message', 'Deze campagne is niet meer actief.'
    );
  END IF;

  BEGIN
    SELECT vc.* INTO v_coupon
      FROM public.volunteer_coupons vc
     WHERE vc.qr_token = p_code::UUID AND vc.campaign_id = v_campaign.id
     FOR UPDATE;
  EXCEPTION WHEN invalid_text_representation THEN
    v_coupon := NULL;
  END;

  IF v_coupon IS NULL THEN
    SELECT vc.* INTO v_coupon
      FROM public.volunteer_coupons vc
     WHERE vc.backup_code = UPPER(TRIM(p_code)) AND vc.campaign_id = v_campaign.id
     FOR UPDATE;
  END IF;

  IF v_coupon IS NULL THEN
    RETURN json_build_object(
      'success', false, 'error', 'invalid_qr',
      'message', 'QR-code niet herkend. Controleer of dit de juiste coupon is.'
    );
  END IF;

  IF v_coupon.status = 'redeemed' THEN
    RETURN json_build_object(
      'success', false, 'error', 'already_redeemed',
      'message', 'Deze coupon werd al ingewisseld.',
      'redeemed_at', v_coupon.redeemed_at
    );
  END IF;

  -- Check expiry
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    UPDATE public.volunteer_coupons SET status = 'expired' WHERE id = v_coupon.id;
    RETURN json_build_object(
      'success', false, 'error', 'expired',
      'message', 'Deze coupon is verlopen.'
    );
  END IF;

  IF v_coupon.status = 'expired' THEN
    RETURN json_build_object(
      'success', false, 'error', 'expired',
      'message', 'Deze coupon is verlopen.'
    );
  END IF;

  UPDATE public.volunteer_coupons
     SET status = 'redeemed', redeemed_at = now()
   WHERE id = v_coupon.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Coupon succesvol ingewisseld!',
    'reward_value_cents', v_campaign.reward_value_cents,
    'reward_text', v_campaign.reward_text,
    'campaign_title', v_campaign.title
  );
END;
$$;

-- 4. Auto-issue coupon trigger: when checked_in_at changes from NULL to a value
CREATE OR REPLACE FUNCTION public.auto_issue_sponsor_coupon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_club_id UUID;
  v_campaign RECORD;
  v_task_date DATE;
  v_validity_days INTEGER;
BEGIN
  IF NEW.checked_in_at IS NOT NULL AND (OLD.checked_in_at IS NULL) THEN
    v_task_id := NEW.task_id;

    SELECT t.club_id, t.task_date INTO v_club_id, v_task_date
    FROM public.tasks t WHERE t.id = v_task_id;

    IF v_club_id IS NULL THEN RETURN NEW; END IF;

    -- Find all active local_coupon campaigns linked to this task
    FOR v_campaign IN
      SELECT sc.id AS campaign_id, sc.coupon_validity_days
      FROM public.sponsor_campaign_tasks sct
      JOIN public.sponsor_campaigns sc ON sc.id = sct.campaign_id
      WHERE sct.task_id = v_task_id
        AND sc.club_id = v_club_id
        AND sc.status = 'active'
        AND sc.campaign_type = 'local_coupon'
    LOOP
      v_validity_days := GREATEST(COALESCE(v_campaign.coupon_validity_days, 30), 7);

      -- Don't issue duplicate coupon for same volunteer+campaign+signup
      IF NOT EXISTS (
        SELECT 1 FROM public.volunteer_coupons
        WHERE volunteer_id = NEW.volunteer_id
          AND campaign_id = v_campaign.campaign_id
          AND task_signup_id = NEW.id
      ) THEN
        INSERT INTO public.volunteer_coupons (
          campaign_id, volunteer_id, task_signup_id, expires_at
        ) VALUES (
          v_campaign.campaign_id,
          NEW.volunteer_id,
          NEW.id,
          COALESCE(v_task_date::timestamptz, now()) + (v_validity_days || ' days')::interval
        );

        -- Notify the volunteer
        INSERT INTO public.notifications (user_id, title, message, type, metadata)
        VALUES (
          NEW.volunteer_id,
          '🎁 Nieuwe coupon ontvangen!',
          'Je hebt een coupon verdiend. Bekijk deze in je dashboard.',
          'reward',
          jsonb_build_object('campaign_id', v_campaign.campaign_id, 'action', 'coupon_earned')
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (after the existing billing trigger)
DROP TRIGGER IF EXISTS trg_auto_issue_sponsor_coupon ON public.task_signups;
CREATE TRIGGER trg_auto_issue_sponsor_coupon
  AFTER UPDATE ON public.task_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_sponsor_coupon();
