
ALTER TABLE public.season_contracts ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
