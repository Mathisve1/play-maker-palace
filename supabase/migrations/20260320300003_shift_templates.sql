-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Shift Templates (Wedstrijd Sjablonen)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Master template table
CREATE TABLE public.shift_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shift_templates_club_id_idx ON public.shift_templates(club_id);

-- 2. Slot rows — each describes one role/shift within a template
--    start_offset_minutes: relative to match kick-off.
--      -120 = starts 2 h before kick-off
--         0 = starts exactly at kick-off
--       +30 = starts 30 min after kick-off
CREATE TABLE public.shift_template_slots (
  id                   UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          UUID  NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
  role_name            TEXT  NOT NULL CHECK (char_length(role_name) BETWEEN 1 AND 100),
  location             TEXT  NOT NULL DEFAULT '',
  required_volunteers  INT   NOT NULL DEFAULT 1 CHECK (required_volunteers BETWEEN 1 AND 500),
  start_offset_minutes INT   NOT NULL DEFAULT 0 CHECK (start_offset_minutes BETWEEN -720 AND 720),
  duration_minutes     INT   NOT NULL DEFAULT 120 CHECK (duration_minutes BETWEEN 5 AND 1440),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shift_template_slots_template_id_idx ON public.shift_template_slots(template_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.shift_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_template_slots  ENABLE ROW LEVEL SECURITY;

-- shift_templates: any club member may read; only club owner (or admin member) may write
CREATE POLICY "shift_templates_select" ON public.shift_templates
  FOR SELECT USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "shift_templates_insert" ON public.shift_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = shift_templates.club_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.club_memberships
      WHERE club_id = shift_templates.club_id
        AND volunteer_id = auth.uid()
        AND club_role IN ('admin', 'manager')
        AND status = 'actief'
    )
  );

CREATE POLICY "shift_templates_update" ON public.shift_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = shift_templates.club_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.club_memberships
      WHERE club_id = shift_templates.club_id
        AND volunteer_id = auth.uid()
        AND club_role IN ('admin', 'manager')
        AND status = 'actief'
    )
  );

CREATE POLICY "shift_templates_delete" ON public.shift_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = shift_templates.club_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.club_memberships
      WHERE club_id = shift_templates.club_id
        AND volunteer_id = auth.uid()
        AND club_role IN ('admin', 'manager')
        AND status = 'actief'
    )
  );

-- shift_template_slots: inherit access from parent template's club
CREATE POLICY "shift_template_slots_select" ON public.shift_template_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shift_templates t
      WHERE t.id = shift_template_slots.template_id
        AND public.is_club_member(auth.uid(), t.club_id)
    )
  );

CREATE POLICY "shift_template_slots_insert" ON public.shift_template_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shift_templates t
      JOIN public.clubs c ON c.id = t.club_id
      WHERE t.id = shift_template_slots.template_id
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.club_memberships m
            WHERE m.club_id = c.id
              AND m.volunteer_id = auth.uid()
              AND m.club_role IN ('admin', 'manager')
              AND m.status = 'actief'
          )
        )
    )
  );

CREATE POLICY "shift_template_slots_update" ON public.shift_template_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shift_templates t
      JOIN public.clubs c ON c.id = t.club_id
      WHERE t.id = shift_template_slots.template_id
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.club_memberships m
            WHERE m.club_id = c.id
              AND m.volunteer_id = auth.uid()
              AND m.club_role IN ('admin', 'manager')
              AND m.status = 'actief'
          )
        )
    )
  );

CREATE POLICY "shift_template_slots_delete" ON public.shift_template_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shift_templates t
      JOIN public.clubs c ON c.id = t.club_id
      WHERE t.id = shift_template_slots.template_id
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.club_memberships m
            WHERE m.club_id = c.id
              AND m.volunteer_id = auth.uid()
              AND m.club_role IN ('admin', 'manager')
              AND m.status = 'actief'
          )
        )
    )
  );
