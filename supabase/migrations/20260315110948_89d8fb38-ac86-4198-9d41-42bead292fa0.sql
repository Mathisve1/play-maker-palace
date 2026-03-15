
-- Club billing state
CREATE TABLE public.club_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  free_contracts_used integer NOT NULL DEFAULT 0,
  free_contracts_limit integer NOT NULL DEFAULT 2,
  stripe_customer_id text,
  billing_email text,
  current_season_volunteers_billed integer NOT NULL DEFAULT 0,
  partner_seats_purchased integer NOT NULL DEFAULT 0,
  partner_seat_price_cents integer NOT NULL DEFAULT 1500,
  volunteer_price_cents integer NOT NULL DEFAULT 1500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Billing events log
CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  volunteer_id uuid,
  season_id uuid,
  partner_id uuid,
  amount_cents integer,
  stripe_payment_intent_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partner seat allocations per event
CREATE TABLE public.partner_seat_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
  partner_id uuid REFERENCES public.external_partners(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  seats_allocated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly invoices
CREATE TABLE public.monthly_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  season_id uuid,
  invoice_month integer NOT NULL,
  invoice_year integer NOT NULL,
  volunteer_count integer NOT NULL DEFAULT 0,
  volunteer_amount_cents integer NOT NULL DEFAULT 0,
  partner_seats_count integer NOT NULL DEFAULT 0,
  partner_seats_amount_cents integer NOT NULL DEFAULT 0,
  total_amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  pdf_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, invoice_month, invoice_year)
);

-- Indexes
CREATE INDEX idx_billing_events_club_created ON public.billing_events(club_id, created_at);
CREATE INDEX idx_partner_seat_alloc_club_season ON public.partner_seat_allocations(club_id, season_id);
CREATE INDEX idx_monthly_invoices_club ON public.monthly_invoices(club_id, invoice_year, invoice_month);

-- RLS
ALTER TABLE public.club_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_seat_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_invoices ENABLE ROW LEVEL SECURITY;

-- Club billing: owner can read/update
CREATE POLICY "Club owner can manage billing" ON public.club_billing
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()));

-- Billing events: owner can read
CREATE POLICY "Club owner can read billing events" ON public.billing_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()));

-- Service role can insert billing events (from edge functions)
CREATE POLICY "Service can insert billing events" ON public.billing_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()));

-- Partner seat allocations: club owner or club member
CREATE POLICY "Club owner manages seat allocations" ON public.partner_seat_allocations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()));

-- Monthly invoices: club owner can read
CREATE POLICY "Club owner can read invoices" ON public.monthly_invoices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_club_billing_updated_at
  BEFORE UPDATE ON public.club_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_partner_seat_alloc_updated_at
  BEFORE UPDATE ON public.partner_seat_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
