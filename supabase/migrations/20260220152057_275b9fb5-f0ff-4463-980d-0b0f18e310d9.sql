
-- Add bank_bic to profiles
ALTER TABLE public.profiles ADD COLUMN bank_bic text;

-- Create sepa_batches table
CREATE TABLE public.sepa_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.clubs(id),
  created_by uuid NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  batch_reference text NOT NULL,
  batch_message text,
  docuseal_submission_id integer,
  docuseal_document_url text,
  signer_name text,
  xml_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sepa_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can read sepa batches"
ON public.sepa_batches FOR SELECT
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club staff can insert sepa batches"
ON public.sepa_batches FOR INSERT
WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club staff can update sepa batches"
ON public.sepa_batches FOR UPDATE
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Create sepa_batch_items table
CREATE TABLE public.sepa_batch_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.sepa_batches(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  amount numeric NOT NULL,
  iban text NOT NULL,
  bic text,
  holder_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sepa_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can manage batch items"
ON public.sepa_batch_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.sepa_batches b
  WHERE b.id = sepa_batch_items.batch_id
  AND has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
));

CREATE POLICY "Volunteers can read own batch items"
ON public.sepa_batch_items FOR SELECT
USING (auth.uid() = volunteer_id);

-- Trigger for updated_at
CREATE TRIGGER update_sepa_batches_updated_at
BEFORE UPDATE ON public.sepa_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
