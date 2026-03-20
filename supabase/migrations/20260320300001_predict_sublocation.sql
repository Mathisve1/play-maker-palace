-- Migration: Predictive Sub-Location Assignment
-- Part B of Blue Ocean features: Smart historical placement for club admins

-- ─────────────────────────────────────────────────────────────────────────────
-- Add predicted_sub_location to task_signups
-- Stores the system-predicted slot for a volunteer based on their task history
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.task_signups
  ADD COLUMN IF NOT EXISTS predicted_sub_location TEXT NULL;

COMMENT ON COLUMN public.task_signups.predicted_sub_location IS
  'System-predicted sublocation (e.g. "Tribune Noord Vak 421") based on volunteer task history. '
  'Set at signup time by predict_volunteer_sublocation(); editable by club admins.';

-- ─────────────────────────────────────────────────────────────────────────────
-- predict_volunteer_sublocation(p_user_id, p_task_title)
--
-- Returns the most frequently completed sub-location for a volunteer whose
-- task titles match (case-insensitive partial match on p_task_title).
-- Returns NULL if no history exists.
--
-- Example:
--   SELECT predict_volunteer_sublocation(
--     'uuid-of-johan',
--     'Steward'
--   );
--   → 'Tribune Noord Vak 421'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.predict_volunteer_sublocation(
  p_user_id    UUID,
  p_task_title TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_predicted TEXT;
BEGIN
  SELECT t.location
  INTO   v_predicted
  FROM   public.task_signups ts
  JOIN   public.tasks t ON t.id = ts.task_id
  WHERE  ts.volunteer_id   = p_user_id
    AND  ts.checked_in_at IS NOT NULL          -- completed tasks only
    AND  t.location        IS NOT NULL
    AND  t.location        <> ''
    AND  t.title           ILIKE '%' || p_task_title || '%'
  GROUP  BY t.location
  ORDER  BY COUNT(*) DESC
  LIMIT  1;

  RETURN v_predicted;   -- NULL if no history
END;
$$;

GRANT EXECUTE ON FUNCTION public.predict_volunteer_sublocation(UUID, TEXT)
  TO authenticated, service_role;
