
-- Season checkins table for tracking check-in/out per visit
CREATE TABLE public.season_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_contract_id UUID NOT NULL REFERENCES public.season_contracts(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  hours_worked NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add barcode and checkin_count to season_contracts
ALTER TABLE public.season_contracts
  ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS checkin_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volunteer_status TEXT NOT NULL DEFAULT 'proef';

-- Index for fast barcode lookup
CREATE INDEX idx_season_checkins_contract ON public.season_checkins(season_contract_id);
CREATE INDEX idx_season_contracts_barcode ON public.season_contracts(barcode);

-- RLS
ALTER TABLE public.season_checkins ENABLE ROW LEVEL SECURITY;

-- Club owners/members can read/write checkins
CREATE POLICY "Club can manage season checkins"
ON public.season_checkins FOR ALL TO authenticated
USING (
  public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::public.club_role[])
)
WITH CHECK (
  public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder','medewerker']::public.club_role[])
);

-- Volunteers can read own checkins
CREATE POLICY "Volunteer can read own checkins"
ON public.season_checkins FOR SELECT TO authenticated
USING (volunteer_id = auth.uid());

-- Function to auto-generate SC- barcode on season contract insert
CREATE OR REPLACE FUNCTION public.generate_season_contract_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := 'SC-' || upper(substr(md5(random()::text || NEW.id::text), 1, 12));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_season_contract_barcode
  BEFORE INSERT ON public.season_contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_season_contract_barcode();

-- Backfill existing season_contracts with barcodes
UPDATE public.season_contracts
SET barcode = 'SC-' || upper(substr(md5(random()::text || id::text), 1, 12))
WHERE barcode IS NULL;
