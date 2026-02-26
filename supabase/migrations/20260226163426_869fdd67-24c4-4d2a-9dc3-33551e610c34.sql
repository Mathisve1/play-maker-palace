
-- Add extra fields to partner_members
ALTER TABLE public.partner_members
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS shirt_size text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Create partner_task_assignments table for assigning members to specific tasks
CREATE TABLE public.partner_task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  partner_member_id uuid NOT NULL REFERENCES public.partner_members(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, partner_member_id)
);

ALTER TABLE public.partner_task_assignments ENABLE ROW LEVEL SECURITY;

-- Partner admins can manage assignments for their tasks
CREATE POLICY "Partner admins can manage task assignments"
ON public.partner_task_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = partner_task_assignments.task_id
      AND t.partner_only = true
      AND t.assigned_partner_id IS NOT NULL
      AND is_partner_admin(auth.uid(), t.assigned_partner_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = partner_task_assignments.task_id
      AND t.partner_only = true
      AND t.assigned_partner_id IS NOT NULL
      AND is_partner_admin(auth.uid(), t.assigned_partner_id)
  )
);

-- Club staff can read assignments
CREATE POLICY "Club staff can read task assignments"
ON public.partner_task_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = partner_task_assignments.task_id
      AND has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  )
);
