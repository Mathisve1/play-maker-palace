
-- Table to store contract types per member per club (supports multiple types)
CREATE TABLE public.member_contract_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.club_memberships(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('steward', 'bar_catering', 'terrain_material', 'admin_ticketing', 'event_support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(membership_id, contract_type)
);

-- Enable RLS
ALTER TABLE public.member_contract_types ENABLE ROW LEVEL SECURITY;

-- Policy: Club members can read contract types for their club's memberships
CREATE POLICY "Club members can view contract types"
  ON public.member_contract_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.id = member_contract_types.membership_id
      AND (
        public.is_club_member(auth.uid(), cm.club_id)
        OR cm.volunteer_id = auth.uid()
      )
    )
  );

-- Policy: Club owners/admins can manage contract types
CREATE POLICY "Club admins can manage contract types"
  ON public.member_contract_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships cm
      JOIN public.clubs c ON c.id = cm.club_id
      WHERE cm.id = member_contract_types.membership_id
      AND (
        c.owner_id = auth.uid()
        OR public.has_club_role(auth.uid(), cm.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_memberships cm
      JOIN public.clubs c ON c.id = cm.club_id
      WHERE cm.id = member_contract_types.membership_id
      AND (
        c.owner_id = auth.uid()
        OR public.has_club_role(auth.uid(), cm.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
      )
    )
  );
