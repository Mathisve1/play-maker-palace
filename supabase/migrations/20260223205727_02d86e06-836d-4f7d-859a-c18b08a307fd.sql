
-- Certificate design templates for clubs
CREATE TABLE public.certificate_designs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Standaard certificaat',
  issuer_name text,
  issuer_title text,
  signature_url text,
  accent_color text DEFAULT '#1e40af',
  custom_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificate_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can manage certificate designs"
ON public.certificate_designs FOR ALL
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Anyone can read certificate designs"
ON public.certificate_designs FOR SELECT
USING (true);

-- Add certificate_design_id to volunteer_certificates for linking
ALTER TABLE public.volunteer_certificates
ADD COLUMN certificate_design_id uuid REFERENCES public.certificate_designs(id) ON DELETE SET NULL;

-- Add pdf_url to store generated certificate PDFs
ALTER TABLE public.volunteer_certificates
ADD COLUMN pdf_url text;

CREATE TRIGGER update_certificate_designs_updated_at
BEFORE UPDATE ON public.certificate_designs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
