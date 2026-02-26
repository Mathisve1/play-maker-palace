
-- Allow partner admins to update partner_acceptance_status on their assigned tasks
CREATE POLICY "Partner admins can update acceptance status"
ON public.tasks
FOR UPDATE
USING (
  partner_only = true 
  AND assigned_partner_id IS NOT NULL 
  AND is_partner_admin(auth.uid(), assigned_partner_id)
)
WITH CHECK (
  partner_only = true 
  AND assigned_partner_id IS NOT NULL 
  AND is_partner_admin(auth.uid(), assigned_partner_id)
);
