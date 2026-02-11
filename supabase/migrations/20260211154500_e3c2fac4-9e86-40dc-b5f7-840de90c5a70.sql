
-- Add stripe_account_id to clubs table
ALTER TABLE public.clubs ADD COLUMN stripe_account_id text;

-- Add stripe_account_id to profiles table  
ALTER TABLE public.profiles ADD COLUMN stripe_account_id text;

-- Create volunteer_payments table
CREATE TABLE public.volunteer_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 25.00,
  stripe_fee numeric,
  total_charged numeric,
  currency text NOT NULL DEFAULT 'eur',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  stripe_receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.volunteer_payments ENABLE ROW LEVEL SECURITY;

-- Club owners can view payments for their clubs
CREATE POLICY "Club owners can view own club payments"
ON public.volunteer_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = volunteer_payments.club_id
    AND (c.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
      AND cm.role IN ('bestuurder', 'beheerder')
    ))
  )
);

-- Club owners can create payments
CREATE POLICY "Club owners can create payments"
ON public.volunteer_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = volunteer_payments.club_id
    AND (c.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
      AND cm.role IN ('bestuurder', 'beheerder')
    ))
  )
);

-- Club owners can update payments
CREATE POLICY "Club owners can update payments"
ON public.volunteer_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = volunteer_payments.club_id
    AND (c.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
      AND cm.role IN ('bestuurder', 'beheerder')
    ))
  )
);

-- Volunteers can view own payments
CREATE POLICY "Volunteers can view own payments"
ON public.volunteer_payments
FOR SELECT
USING (auth.uid() = volunteer_id);

-- Admins can manage all payments
CREATE POLICY "Admins can manage payments"
ON public.volunteer_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_volunteer_payments_updated_at
BEFORE UPDATE ON public.volunteer_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
