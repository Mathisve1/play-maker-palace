
-- Junction table: partners can belong to multiple clubs
CREATE TABLE public.partner_clubs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(partner_id, club_id)
);

ALTER TABLE public.partner_clubs ENABLE ROW LEVEL SECURITY;

-- Club staff can manage their partner_clubs entries
CREATE POLICY "Club staff can manage partner_clubs"
ON public.partner_clubs FOR ALL
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Partner admins can read their partner_clubs
CREATE POLICY "Partner admins can read partner_clubs"
ON public.partner_clubs FOR SELECT
USING (is_partner_admin(auth.uid(), partner_id));

-- Populate from existing data: every external_partner already has a club_id
INSERT INTO public.partner_clubs (partner_id, club_id)
SELECT id, club_id FROM public.external_partners
ON CONFLICT DO NOTHING;

-- Update the get_partner_club_id function to support multi-club
-- (keep for backward compat, returns first club)
CREATE OR REPLACE FUNCTION public.get_partner_club_ids(_partner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT club_id FROM public.partner_clubs WHERE partner_id = _partner_id
$$;

-- Update external_partners RLS: allow any linked club staff to manage
DROP POLICY IF EXISTS "Club staff can manage partners" ON public.external_partners;
CREATE POLICY "Club staff can manage partners"
ON public.external_partners FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clubs pc
    WHERE pc.partner_id = external_partners.id
    AND has_club_role(auth.uid(), pc.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  )
)
WITH CHECK (
  -- For INSERT, check club_id on the partner itself
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
);

-- Partner members: allow partner admins (already works) and any linked club staff to read
DROP POLICY IF EXISTS "Club staff can read partner members" ON public.partner_members;
CREATE POLICY "Club staff can read partner members"
ON public.partner_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_clubs pc
    WHERE pc.partner_id = partner_members.partner_id
    AND has_club_role(auth.uid(), pc.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  )
);
