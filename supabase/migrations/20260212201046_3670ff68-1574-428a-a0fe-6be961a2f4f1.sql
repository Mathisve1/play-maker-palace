
-- Table to track section/block-level completion by volunteers
CREATE TABLE public.briefing_block_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id uuid NOT NULL REFERENCES public.briefing_blocks(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(block_id, volunteer_id)
);

ALTER TABLE public.briefing_block_progress ENABLE ROW LEVEL SECURITY;

-- Volunteers can manage their own block progress
CREATE POLICY "Volunteers can manage own block progress"
  ON public.briefing_block_progress
  FOR ALL
  USING (auth.uid() = volunteer_id);

-- Club members can read block progress
CREATE POLICY "Club members can read block progress"
  ON public.briefing_block_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM briefing_blocks bl
      JOIN briefing_groups g ON g.id = bl.group_id
      JOIN briefings b ON b.id = g.briefing_id
      WHERE bl.id = briefing_block_progress.block_id
        AND has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role])
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.briefing_block_progress;
