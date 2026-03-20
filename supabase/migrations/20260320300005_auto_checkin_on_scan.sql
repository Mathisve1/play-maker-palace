-- ─────────────────────────────────────────────────────────────────────────────
-- auto_checkin_on_card_scan(p_user_id, p_club_id)
--
-- Called by the pos-integration Edge Function immediately after card_uid
-- resolves to a user_id (VERIFY action).
--
-- Logic:
--   Find all task_signups for this volunteer at this club where:
--     • attendance_status = 'scheduled'  (not already checked in)
--     • is_draft = false                 (published assignments only)
--     • status IN ('assigned','pending')
--     • task.start_time is within the next 120 minutes  ← "arriving soon"
--       OR task is currently ongoing (start_time ≤ now ≤ end_time)
--       Concretely: start_time ≤ now + 120 min
--                   AND (end_time IS NULL OR end_time ≥ now - 30 min)
--
--   For all matching rows:
--     SET attendance_status = 'checked_in'
--     SET checked_in_at     = now()   (triggers existing billing trigger)
--
-- Returns: JSONB array of tasks that were just checked in, e.g.
--   [{ task_id, task_title, start_time, location }, ...]
--   (empty array if no matching tasks)
--
-- Security: SECURITY DEFINER, called by the POS edge function which uses
--   the service_role key — auth.uid() is NULL in that context.
--   Authorisation is enforced at the Edge Function level (API key → club).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_checkin_on_card_scan(
  p_user_id UUID,
  p_club_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_ids UUID[];
  v_result   JSONB;
BEGIN
  -- ── Step 1: Collect eligible task_ids ────────────────────────────────────
  SELECT ARRAY(
    SELECT ts.task_id
    FROM   public.task_signups ts
    JOIN   public.tasks t ON t.id = ts.task_id
    WHERE  ts.volunteer_id      = p_user_id
      AND  t.club_id            = p_club_id
      AND  ts.is_draft          = false
      AND  ts.status            IN ('assigned', 'pending')
      AND  ts.attendance_status = 'scheduled'
      AND  t.start_time         IS NOT NULL
      -- starts within the next 120 minutes
      AND  t.start_time         <= now() + INTERVAL '120 minutes'
      -- not already finished more than 30 minutes ago
      AND  (t.end_time IS NULL OR t.end_time >= now() - INTERVAL '30 minutes')
  ) INTO v_task_ids;

  -- Nothing to do → return empty array immediately
  IF array_length(v_task_ids, 1) IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- ── Step 2: Mark them all as checked_in ──────────────────────────────────
  -- Setting checked_in_at also fires the existing billing trigger
  -- (trg_update_volunteer_season_usage) which handles the €15 billing logic.
  UPDATE public.task_signups
  SET attendance_status = 'checked_in',
      checked_in_at     = COALESCE(checked_in_at, now())
  WHERE volunteer_id = p_user_id
    AND task_id      = ANY(v_task_ids);

  -- ── Step 3: Return task details for the POS terminal display ─────────────
  SELECT jsonb_agg(
    jsonb_build_object(
      'task_id',    t.id,
      'task_title', t.title,
      'start_time', t.start_time,
      'location',   t.location
    )
    ORDER BY t.start_time
  )
  INTO v_result
  FROM public.tasks t
  WHERE t.id = ANY(v_task_ids);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Callable by both the service-role POS edge function and authenticated admins
GRANT EXECUTE ON FUNCTION public.auto_checkin_on_card_scan(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_checkin_on_card_scan(UUID, UUID) TO authenticated;
