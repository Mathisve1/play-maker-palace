
-- Add emoji column to safety_incident_types (optional)
ALTER TABLE public.safety_incident_types ADD COLUMN IF NOT EXISTS emoji text DEFAULT NULL;

-- Create safety_location_levels (hierarchical levels per club, e.g. "Tribune", "Vak", "Rij")
CREATE TABLE public.safety_location_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_location_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read location levels"
  ON public.safety_location_levels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage location levels"
  ON public.safety_location_levels FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Create safety_location_options (options per level, e.g. "Hoofdtribune", "Bezoekerstribune")
CREATE TABLE public.safety_location_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id uuid NOT NULL REFERENCES public.safety_location_levels(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_location_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read location options"
  ON public.safety_location_options FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage location options"
  ON public.safety_location_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.safety_location_levels l
    WHERE l.id = safety_location_options.level_id
    AND has_club_role(auth.uid(), l.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

-- Add location_data jsonb to safety_incidents to store selected location values
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS location_data jsonb DEFAULT NULL;
