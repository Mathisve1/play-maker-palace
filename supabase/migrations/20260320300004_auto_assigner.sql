-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Smart Auto-Assigner (De Auto-Vul Magie)
-- Phases 1-3: Event kickoff time, template application, scoring algorithm,
--             draft assignments, publish-and-notify.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. events: add kickoff_time + shift_template backlink ────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS kickoff_time      TIME,
  ADD COLUMN IF NOT EXISTS shift_template_id UUID
    REFERENCES public.shift_templates(id) ON DELETE SET NULL;

-- ── 2. task_signups: draft flag for auto-generated assignments ────────────────
ALTER TABLE public.task_signups
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_task_signups_is_draft
  ON public.task_signups(is_draft) WHERE is_draft = true;

-- ── 3. UNIQUE constraint (task_id, volunteer_id) — required for ON CONFLICT ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'task_signups_task_volunteer_unique'
      AND conrelid = 'public.task_signups'::regclass
  ) THEN
    ALTER TABLE public.task_signups
      ADD CONSTRAINT task_signups_task_volunteer_unique
      UNIQUE (task_id, volunteer_id);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. apply_shift_template_to_event(p_event_id, p_template_id)
--
--    Reads all shift_template_slots for the given template and inserts real
--    tasks linked to the event. Exact start_time / end_time are calculated
--    from the event's kickoff:
--
--      kickoff_at = event_date + kickoff_time (defaults to 15:00 if NULL)
--      task.start_time = kickoff_at + start_offset_minutes
--      task.end_time   = task.start_time + duration_minutes
--
--    Returns the number of tasks created.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_shift_template_to_event(
  p_event_id    UUID,
  p_template_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event      RECORD;
  v_kickoff_at TIMESTAMPTZ;
  v_slot       RECORD;
  v_created    INT := 0;
  v_start      TIMESTAMPTZ;
  v_end        TIMESTAMPTZ;
BEGIN
  -- Fetch event
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event % not found', p_event_id; END IF;

  -- Authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = v_event.club_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE club_id = v_event.club_id AND volunteer_id = auth.uid()
      AND club_role IN ('admin', 'manager') AND status = 'actief'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify template belongs to this club
  IF NOT EXISTS (
    SELECT 1 FROM public.shift_templates
    WHERE id = p_template_id AND club_id = v_event.club_id
  ) THEN
    RAISE EXCEPTION 'Template does not belong to this club';
  END IF;

  IF v_event.event_date IS NULL THEN
    RAISE EXCEPTION 'Event has no date set';
  END IF;

  -- Build kickoff timestamp (default 15:00 when no kickoff_time stored)
  v_kickoff_at := (
    v_event.event_date::TEXT || ' ' ||
    COALESCE(v_event.kickoff_time::TEXT, '15:00:00')
  )::TIMESTAMPTZ;

  -- Insert one task per slot
  FOR v_slot IN
    SELECT * FROM public.shift_template_slots
    WHERE template_id = p_template_id
    ORDER BY start_offset_minutes
  LOOP
    v_start := v_kickoff_at + (v_slot.start_offset_minutes * INTERVAL '1 minute');
    v_end   := v_start      + (v_slot.duration_minutes      * INTERVAL '1 minute');

    INSERT INTO public.tasks (
      club_id, event_id, title, location,
      task_date, start_time, end_time,
      spots_available, status, compensation_type
    ) VALUES (
      v_event.club_id, p_event_id,
      v_slot.role_name, v_slot.location,
      v_event.event_date, v_start, v_end,
      v_slot.required_volunteers, 'open', 'fixed'
    );

    v_created := v_created + 1;
  END LOOP;

  -- Record which template was applied
  UPDATE public.events
  SET shift_template_id = p_template_id
  WHERE id = p_event_id;

  RETURN v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_shift_template_to_event(UUID, UUID)
  TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. predict_and_assign_shifts(p_event_id)
--
--    The Smart Auto-Assigner — scores every eligible volunteer per task and
--    inserts draft assignments (is_draft = true).
--
--    SCORING per task (cumulative):
--      +30  Tier 1 — on reserve_list for this event date / event_id
--      +20 each (cap +60) — Tier 2 — past completed shifts matching this role
--      +10  Tier 3 — has accepted buddy already placed in this event
--      +random tiebreaker for fairness
--
--    Calling this function again wipes previous drafts for the event first.
--
--    Returns { assigned: N, tasks_processed: M, event_id: "..." }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.predict_and_assign_shifts(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event       RECORD;
  v_club_id     UUID;
  v_task        RECORD;
  v_vol         RECORD;
  v_assigned    INT := 0;
  v_processed   INT := 0;
  v_open        INT;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────────────────────
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event % not found', p_event_id; END IF;

  v_club_id := v_event.club_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = v_club_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE club_id = v_club_id AND volunteer_id = auth.uid()
      AND club_role IN ('admin', 'manager') AND status = 'actief'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── Wipe previous drafts for this event ───────────────────────────────────
  DELETE FROM public.task_signups
  WHERE is_draft = true
    AND task_id IN (SELECT id FROM public.tasks WHERE event_id = p_event_id);

  -- ── Process tasks that still need filling ─────────────────────────────────
  FOR v_task IN
    SELECT
      t.*,
      GREATEST(
        t.spots_available - COALESCE((
          SELECT COUNT(*)::INT
          FROM   public.task_signups ts
          WHERE  ts.task_id = t.id
            AND  ts.status IN ('assigned', 'pending')
            AND  ts.is_draft = false
        ), 0),
        0
      ) AS open_spots
    FROM public.tasks t
    WHERE t.event_id = p_event_id
      AND COALESCE(t.status, 'open') NOT IN ('cancelled', 'closed')
    ORDER BY t.start_time NULLS LAST, t.title
  LOOP
    v_processed := v_processed + 1;
    v_open      := v_task.open_spots;
    IF v_open = 0 THEN CONTINUE; END IF;

    -- ── Score candidates for this task ──────────────────────────────────────
    FOR v_vol IN
      WITH
      -- Active members not already on this task or overlapping task
      eligible AS (
        SELECT cm.volunteer_id
        FROM   public.club_memberships cm
        WHERE  cm.club_id = v_club_id
          AND  cm.status  = 'actief'
          -- not already on this specific task
          AND  NOT EXISTS (
            SELECT 1 FROM public.task_signups x
            WHERE  x.task_id     = v_task.id
              AND  x.volunteer_id = cm.volunteer_id
          )
          -- not in a time-overlapping confirmed task for this event
          AND  NOT EXISTS (
            SELECT 1
            FROM   public.task_signups x2
            JOIN   public.tasks t2 ON t2.id = x2.task_id
            WHERE  t2.event_id      = p_event_id
              AND  x2.volunteer_id  = cm.volunteer_id
              AND  x2.status        IN ('assigned', 'pending')
              AND  x2.is_draft      = false
              AND  v_task.start_time IS NOT NULL
              AND  t2.start_time     IS NOT NULL
              AND  t2.end_time       IS NOT NULL
              AND  v_task.start_time  < t2.end_time
              AND  v_task.end_time    > t2.start_time
          )
      ),

      -- Tier 1: reserve list (+30)
      tier1 AS (
        SELECT rl.user_id, 30 AS pts
        FROM   public.reserve_lists rl
        WHERE  rl.club_id = v_club_id
          AND  rl.user_id IN (SELECT volunteer_id FROM eligible)
          AND  (rl.event_id = p_event_id OR rl.event_date = v_event.event_date)
        GROUP  BY rl.user_id
      ),

      -- Tier 2: historical role completions (20 pts each, cap 3 = +60)
      tier2 AS (
        SELECT
          ts.volunteer_id,
          LEAST(COUNT(*)::INT * 20, 60) AS pts
        FROM   public.task_signups ts
        JOIN   public.tasks t ON t.id = ts.task_id
        WHERE  ts.volunteer_id IN (SELECT volunteer_id FROM eligible)
          AND  ts.checked_in_at IS NOT NULL
          AND  t.club_id = v_club_id
          AND  t.title   ILIKE '%' || v_task.title || '%'
        GROUP  BY ts.volunteer_id
      ),

      -- Tier 3: accepted buddy already placed in this event (+10)
      tier3 AS (
        SELECT DISTINCT
          CASE
            WHEN vb.requester_id IN (SELECT volunteer_id FROM eligible)
              THEN vb.requester_id
            ELSE vb.buddy_id
          END AS volunteer_id,
          10 AS pts
        FROM  public.volunteer_buddies vb
        WHERE vb.status = 'accepted'
          AND (
            vb.requester_id IN (SELECT volunteer_id FROM eligible) OR
            vb.buddy_id     IN (SELECT volunteer_id FROM eligible)
          )
          -- their buddy is confirmed-assigned somewhere in this event
          AND (
            EXISTS (
              SELECT 1
              FROM   public.task_signups ts3
              JOIN   public.tasks t3 ON t3.id = ts3.task_id
              WHERE  t3.event_id      = p_event_id
                AND  ts3.is_draft     = false
                AND  ts3.status       IN ('assigned', 'pending')
                AND  ts3.volunteer_id =
                  CASE
                    WHEN vb.requester_id IN (SELECT volunteer_id FROM eligible)
                      THEN vb.buddy_id
                    ELSE vb.requester_id
                  END
            )
          )
      ),

      -- Final scores
      scored AS (
        SELECT
          e.volunteer_id,
          COALESCE(t1.pts, 0)
          + COALESCE(t2.pts, 0)
          + COALESCE(t3.pts, 0) AS total_score
        FROM   eligible e
        LEFT   JOIN tier1 t1 ON t1.user_id      = e.volunteer_id
        LEFT   JOIN tier2 t2 ON t2.volunteer_id = e.volunteer_id
        LEFT   JOIN tier3 t3 ON t3.volunteer_id = e.volunteer_id
        ORDER  BY total_score DESC, random()
        LIMIT  v_open
      )
      SELECT volunteer_id, total_score FROM scored
    LOOP
      INSERT INTO public.task_signups (
        task_id, volunteer_id, status, is_draft, predicted_sub_location
      ) VALUES (
        v_task.id,
        v_vol.volunteer_id,
        'assigned',
        true,
        public.predict_volunteer_sublocation(v_vol.volunteer_id, v_task.title)
      )
      ON CONFLICT (task_id, volunteer_id) DO NOTHING;

      v_assigned := v_assigned + 1;
    END LOOP;

  END LOOP;

  RETURN jsonb_build_object(
    'assigned',        v_assigned,
    'tasks_processed', v_processed,
    'event_id',        p_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.predict_and_assign_shifts(UUID)
  TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. publish_event_assignments(p_event_id)
--
--    Flips all draft assignments (is_draft = true → false) for an event.
--    Returns an array of objects for the client to send push notifications:
--      [{ volunteer_id, full_name, task_title, task_start_time, task_location }]
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_event_assignments(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event   RECORD;
  v_club_id UUID;
  v_result  JSONB;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event % not found', p_event_id; END IF;

  v_club_id := v_event.club_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = v_club_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE club_id = v_club_id AND volunteer_id = auth.uid()
      AND club_role IN ('admin', 'manager') AND status = 'actief'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Flip drafts → confirmed
  UPDATE public.task_signups
  SET    is_draft = false
  WHERE  is_draft = true
    AND  task_id IN (SELECT id FROM public.tasks WHERE event_id = p_event_id);

  -- Collect data for push notifications
  SELECT jsonb_agg(jsonb_build_object(
    'volunteer_id',    ts.volunteer_id,
    'full_name',       p.full_name,
    'task_title',      t.title,
    'task_start_time', t.start_time,
    'task_location',   t.location
  ) ORDER BY p.full_name)
  INTO   v_result
  FROM   public.task_signups ts
  JOIN   public.tasks   t  ON t.id  = ts.task_id
  JOIN   public.profiles p ON p.id  = ts.volunteer_id
  WHERE  t.event_id  = p_event_id
    AND  ts.is_draft = false
    AND  ts.status   = 'assigned';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_event_assignments(UUID)
  TO authenticated;
