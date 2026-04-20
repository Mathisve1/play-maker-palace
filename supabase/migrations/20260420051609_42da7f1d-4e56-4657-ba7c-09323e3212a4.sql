-- Koppeltabel voor safety rollen ↔ herbruikbare club-zones
CREATE TABLE IF NOT EXISTS public.safety_role_club_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.safety_roles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.club_safety_zones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_srcz_role ON public.safety_role_club_zones(role_id);
CREATE INDEX IF NOT EXISTS idx_srcz_zone ON public.safety_role_club_zones(zone_id);

ALTER TABLE public.safety_role_club_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view safety role club zones"
  ON public.safety_role_club_zones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.safety_roles sr
    WHERE sr.id = safety_role_club_zones.role_id
      AND public.is_club_member(auth.uid(), sr.club_id)
  ));

CREATE POLICY "Admins manage safety role club zones"
  ON public.safety_role_club_zones
  USING (EXISTS (
    SELECT 1 FROM public.safety_roles sr
    WHERE sr.id = safety_role_club_zones.role_id
      AND public.has_club_role(auth.uid(), sr.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.safety_roles sr
    WHERE sr.id = safety_role_club_zones.role_id
      AND public.has_club_role(auth.uid(), sr.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));