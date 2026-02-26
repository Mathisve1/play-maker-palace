
-- Add partner-only task support
ALTER TABLE public.tasks
  ADD COLUMN partner_only boolean NOT NULL DEFAULT false,
  ADD COLUMN assigned_partner_id uuid REFERENCES public.external_partners(id) ON DELETE SET NULL;

-- Partner admins can read tasks assigned to their partner
CREATE POLICY "Partner admins can read assigned tasks"
  ON public.tasks FOR SELECT
  USING (partner_only = true AND assigned_partner_id IS NOT NULL AND is_partner_admin(auth.uid(), assigned_partner_id));
