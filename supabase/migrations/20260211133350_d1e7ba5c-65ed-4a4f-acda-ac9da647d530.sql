
-- Create contract_templates table
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  docuseal_template_id INTEGER NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Club leaders can read templates for their club
CREATE POLICY "Club leaders can read templates"
ON public.contract_templates FOR SELECT
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Club leaders can create templates
CREATE POLICY "Club leaders can create templates"
ON public.contract_templates FOR INSERT
WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Club leaders can delete templates
CREATE POLICY "Club leaders can delete templates"
ON public.contract_templates FOR DELETE
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Admins full access
CREATE POLICY "Admins can manage templates"
ON public.contract_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add contract_template_id to tasks (nullable for existing tasks)
ALTER TABLE public.tasks ADD COLUMN contract_template_id UUID REFERENCES public.contract_templates(id);

-- Create storage bucket for contract template PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-templates', 'contract-templates', false);

-- Storage policies: club leaders can upload PDFs
CREATE POLICY "Club leaders can upload contract PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');

-- Club leaders can read their uploaded PDFs
CREATE POLICY "Authenticated can read contract PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');

-- Club leaders can delete PDFs
CREATE POLICY "Authenticated can delete contract PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');
