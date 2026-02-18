
-- Table for monthly compliance declarations by volunteers
CREATE TABLE public.compliance_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL,
  declaration_year INTEGER NOT NULL,
  declaration_month INTEGER NOT NULL CHECK (declaration_month BETWEEN 1 AND 12),
  external_income NUMERIC NOT NULL DEFAULT 0,
  external_hours INTEGER NOT NULL DEFAULT 0,
  declared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  docuseal_submission_id INTEGER,
  signature_status TEXT NOT NULL DEFAULT 'pending',
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, declaration_year, declaration_month)
);

ALTER TABLE public.compliance_declarations ENABLE ROW LEVEL SECURITY;

-- Volunteers can manage their own declarations
CREATE POLICY "Volunteers can read own declarations"
ON public.compliance_declarations FOR SELECT
USING (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can insert own declarations"
ON public.compliance_declarations FOR INSERT
WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can update own declarations"
ON public.compliance_declarations FOR UPDATE
USING (auth.uid() = volunteer_id);

-- Club owners/beheerders can read declarations for their volunteers
CREATE POLICY "Club staff can read volunteer declarations"
ON public.compliance_declarations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM task_signups ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN clubs c ON c.id = t.club_id
    WHERE ts.volunteer_id = compliance_declarations.volunteer_id
    AND (c.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
      AND cm.role IN ('bestuurder', 'beheerder')
    ))
  )
);

-- Admins can manage all
CREATE POLICY "Admins can manage declarations"
ON public.compliance_declarations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_compliance_declarations_updated_at
BEFORE UPDATE ON public.compliance_declarations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
