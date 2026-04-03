-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260403000000_secure_task_signups
-- Purpose  : Two concerns in one migration:
--
--   A. Schema fix  – club_invitations.role was club_role enum which only
--      contained 'bestuurder','beheerder','medewerker'. The partner invite
--      flow already uses 'partner_admin' and the new flow adds 'partner_member'.
--      Change the column to TEXT so any role string is accepted.
--
--   B. Security triggers – Database-level enforcement for task_signups that
--      the frontend UI alone cannot guarantee:
--        1. Spots available  – row-locked capacity gate (prevents overbooking)
--        2. Required training – volunteer must hold the required certificate
--        3. Double booking   – volunteer cannot hold two overlapping shifts
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part A: Widen club_invitations.role to TEXT
-- ═══════════════════════════════════════════════════════════════════════════════
-- The existing club_role ENUM only has three values and blocks partner roles.
-- Cast to TEXT preserves all existing data and accepts any future role string.
ALTER TABLE public.club_invitations
  ALTER COLUMN role TYPE TEXT USING role::TEXT;

-- Keep a sensible default
ALTER TABLE public.club_invitations
  ALTER COLUMN role SET DEFAULT 'medewerker';


-- ═══════════════════════════════════════════════════════════════════════════════
-- Part B: task_signups security trigger
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_secure_task_signups()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_spots             INTEGER;
  v_signup_count      INTEGER;
  v_required_training UUID;
  v_task_date         TIMESTAMPTZ;
  v_start_time        TIMESTAMPTZ;
  v_end_time          TIMESTAMPTZ;
  v_becoming_active   BOOLEAN;
BEGIN
  -- ── Determine if this operation is activating a signup ────────────────────
  -- On INSERT, status defaults to 'pending' so checks always apply.
  -- On UPDATE, only re-run checks when the row transitions INTO an active state
  -- (e.g. a cancelled signup being re-opened).  Pure status→status moves
  -- within active states, or any change unrelated to status, are skipped.
  v_becoming_active := (
    TG_OP = 'INSERT'
    OR (
      TG_OP = 'UPDATE'
      AND NEW.status IN ('pending', 'assigned')
      AND (OLD.status IS NULL OR OLD.status NOT IN ('pending', 'assigned'))
    )
  );

  IF NOT v_becoming_active THEN
    RETURN NEW;
  END IF;

  -- ── Fetch task data (single query; row lock prevents concurrent overbooking)
  SELECT spots_available,
         required_training_id,
         task_date,
         start_time,
         end_time
  INTO   v_spots,
         v_required_training,
         v_task_date,
         v_start_time,
         v_end_time
  FROM   public.tasks
  WHERE  id = NEW.task_id
  FOR UPDATE;                          -- serialise concurrent INSERT attempts

  -- ── Check 1: Spots available ──────────────────────────────────────────────
  -- Count active signups for this task, excluding the current row (UPDATE case).
  IF v_spots IS NOT NULL THEN
    SELECT COUNT(*)
    INTO   v_signup_count
    FROM   public.task_signups
    WHERE  task_id = NEW.task_id
      AND  status  IN ('pending', 'assigned')
      AND  id      != NEW.id;          -- harmless no-op on INSERT (id not yet in table)

    IF v_signup_count >= v_spots THEN
      RAISE EXCEPTION 'Task is full. No spots available.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- ── Check 2: Required training ────────────────────────────────────────────
  -- Only enforced on INSERT — training status is fixed at signup time and
  -- should not block administrative status updates made by club managers.
  IF TG_OP = 'INSERT' AND v_required_training IS NOT NULL THEN
    SELECT COUNT(*)
    INTO   v_signup_count
    FROM   public.volunteer_certificates
    WHERE  volunteer_id = NEW.volunteer_id
      AND  training_id  = v_required_training;

    IF v_signup_count = 0 THEN
      RAISE EXCEPTION 'Missing required training for this task.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- ── Check 3: Double booking (overlapping shifts) ──────────────────────────
  -- Skip if the task has no explicit time window; date-only tasks allow
  -- multiple signups on the same day (different time slots are unknown).
  IF v_task_date IS NOT NULL
     AND v_start_time IS NOT NULL
     AND v_end_time   IS NOT NULL
  THEN
    IF EXISTS (
      SELECT 1
      FROM   public.task_signups  ts
      JOIN   public.tasks         t  ON t.id = ts.task_id
      WHERE  ts.volunteer_id = NEW.volunteer_id
        AND  ts.task_id     != NEW.task_id      -- different task
        AND  ts.id          != NEW.id           -- exclude self on UPDATE
        AND  ts.status       IN ('pending', 'assigned')
        AND  t.task_date::date = v_task_date::date
        AND  t.start_time  IS NOT NULL
        AND  t.end_time    IS NOT NULL
        -- Standard interval overlap: A starts before B ends AND A ends after B starts
        AND  t.start_time  <  v_end_time
        AND  t.end_time    >  v_start_time
    ) THEN
      RAISE EXCEPTION 'Volunteer is already assigned to an overlapping task on this date.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Attach trigger ────────────────────────────────────────────────────────────
-- Drop first to allow idempotent re-runs of this migration.
DROP TRIGGER IF EXISTS trg_secure_task_signups ON public.task_signups;

CREATE TRIGGER trg_secure_task_signups
  BEFORE INSERT OR UPDATE
  ON public.task_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_secure_task_signups();

-- ── Helpful comments ──────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.fn_secure_task_signups() IS 'BEFORE INSERT OR UPDATE trigger on task_signups. Enforces: (1) capacity limit via row-level lock, (2) required training certificate on INSERT, (3) no overlapping shifts for the same volunteer.';
