
-- Table to track DocuSeal signature requests
CREATE TABLE public.signature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  club_owner_id UUID NOT NULL,
  docuseal_submission_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  signing_url TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can view own signature requests"
ON public.signature_requests FOR SELECT
USING (auth.uid() = volunteer_id);

CREATE POLICY "Club owners can view signature requests for their tasks"
ON public.signature_requests FOR SELECT
USING (auth.uid() = club_owner_id);

CREATE POLICY "Club owners can create signature requests"
ON public.signature_requests FOR INSERT
WITH CHECK (auth.uid() = club_owner_id);

CREATE POLICY "Club owners can update signature requests"
ON public.signature_requests FOR UPDATE
USING (auth.uid() = club_owner_id);

CREATE POLICY "Admins can manage signature requests"
ON public.signature_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_signature_requests_updated_at
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
