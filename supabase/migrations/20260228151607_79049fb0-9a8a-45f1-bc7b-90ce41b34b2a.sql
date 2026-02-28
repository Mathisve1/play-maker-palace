
-- Add wristband/material columns to event_groups
ALTER TABLE public.event_groups
  ADD COLUMN wristband_color TEXT DEFAULT NULL,
  ADD COLUMN wristband_label TEXT DEFAULT NULL,
  ADD COLUMN materials_note TEXT DEFAULT NULL;
