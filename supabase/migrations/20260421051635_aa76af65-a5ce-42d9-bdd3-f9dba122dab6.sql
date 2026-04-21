-- Allow partner admins to create invitations for their own partner
CREATE POLICY "Partner admins can create partner invitations"
ON public.club_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  partner_id IS NOT NULL
  AND public.is_partner_admin(auth.uid(), partner_id)
  AND invited_by = auth.uid()
  AND role IN ('partner_member', 'partner_admin')
);

-- Allow partner admins to view invitations for their own partner
CREATE POLICY "Partner admins can view partner invitations"
ON public.club_invitations
FOR SELECT
TO authenticated
USING (
  partner_id IS NOT NULL
  AND public.is_partner_admin(auth.uid(), partner_id)
);

-- Allow partner admins to update (e.g. resend / cancel) their partner invitations
CREATE POLICY "Partner admins can update partner invitations"
ON public.club_invitations
FOR UPDATE
TO authenticated
USING (
  partner_id IS NOT NULL
  AND public.is_partner_admin(auth.uid(), partner_id)
);