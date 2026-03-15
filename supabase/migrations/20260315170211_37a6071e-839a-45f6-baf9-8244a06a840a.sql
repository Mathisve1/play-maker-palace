
-- Add contract_type and is_billable columns to season_contracts
ALTER TABLE public.season_contracts
  ADD COLUMN IF NOT EXISTS contract_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_billable boolean DEFAULT false;

-- Create function to track contract type usage and billing
CREATE OR REPLACE FUNCTION public.track_contract_type_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category text;
  v_distinct_types integer;
  v_free_limit integer := 2;
  v_current_used integer;
BEGIN
  -- Get the category from the template
  SELECT category::text INTO v_category
  FROM public.season_contract_templates
  WHERE id = NEW.template_id;

  -- Store the contract_type on the contract row
  NEW.contract_type := COALESCE(v_category, 'custom');

  -- Count how many DISTINCT contract types this club already has in season_contracts
  -- (excluding this new one, since it's not inserted yet)
  SELECT COUNT(DISTINCT contract_type) INTO v_distinct_types
  FROM public.season_contracts
  WHERE club_id = NEW.club_id
    AND contract_type IS NOT NULL;

  -- Check if this type is NEW for this club
  IF NOT EXISTS (
    SELECT 1 FROM public.season_contracts
    WHERE club_id = NEW.club_id AND contract_type = NEW.contract_type
  ) THEN
    -- This is a new type — increment free_contracts_used
    UPDATE public.club_billing
    SET free_contracts_used = free_contracts_used + 1
    WHERE club_id = NEW.club_id;

    -- Get updated count
    SELECT free_contracts_used INTO v_current_used
    FROM public.club_billing
    WHERE club_id = NEW.club_id;
  ELSE
    -- Existing type — get current count
    SELECT free_contracts_used INTO v_current_used
    FROM public.club_billing
    WHERE club_id = NEW.club_id;
  END IF;

  -- If free_contracts_used > 2 after increment, this contract is billable
  IF COALESCE(v_current_used, 0) > v_free_limit THEN
    -- Check if THIS contract's type is one of the paid ones (3rd+ type)
    -- We need to know the order: get all distinct types ordered by first appearance
    IF (
      SELECT COUNT(*) FROM (
        SELECT DISTINCT contract_type FROM public.season_contracts
        WHERE club_id = NEW.club_id AND contract_type IS NOT NULL
        UNION
        SELECT NEW.contract_type
      ) sub
    ) > v_free_limit THEN
      -- Check if this specific type was introduced after the free limit
      -- Simple approach: if the type already exists and was free, keep it free
      -- If it's new and we're past the limit, it's billable
      IF NOT EXISTS (
        SELECT 1 FROM public.season_contracts
        WHERE club_id = NEW.club_id AND contract_type = NEW.contract_type AND is_billable = false
      ) THEN
        -- No existing free contracts of this type — could be new or all billable
        -- If there are existing contracts of this type that are billable, this one is too
        NEW.is_billable := true;
      ELSE
        -- There are free contracts of this type — keep same status
        NEW.is_billable := false;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_track_contract_type_billing ON public.season_contracts;
CREATE TRIGGER trg_track_contract_type_billing
  BEFORE INSERT ON public.season_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.track_contract_type_billing();

-- Backfill existing contracts with contract_type from their template
UPDATE public.season_contracts sc
SET contract_type = (
  SELECT sct.category::text
  FROM public.season_contract_templates sct
  WHERE sct.id = sc.template_id
)
WHERE sc.contract_type IS NULL;

-- Backfill is_billable for existing contracts
-- For each club, find distinct types in order of first appearance, mark 3rd+ as billable
DO $$
DECLARE
  r RECORD;
  v_types text[];
  v_type text;
  v_count integer;
BEGIN
  FOR r IN SELECT DISTINCT club_id FROM public.season_contracts LOOP
    v_types := ARRAY(
      SELECT DISTINCT contract_type FROM public.season_contracts
      WHERE club_id = r.club_id AND contract_type IS NOT NULL
      ORDER BY contract_type
    );
    v_count := 0;
    FOREACH v_type IN ARRAY v_types LOOP
      v_count := v_count + 1;
      IF v_count > 2 THEN
        UPDATE public.season_contracts
        SET is_billable = true
        WHERE club_id = r.club_id AND contract_type = v_type;
      END IF;
    END LOOP;
    -- Update club_billing free_contracts_used
    UPDATE public.club_billing
    SET free_contracts_used = array_length(v_types, 1)
    WHERE club_id = r.club_id;
  END LOOP;
END;
$$;
