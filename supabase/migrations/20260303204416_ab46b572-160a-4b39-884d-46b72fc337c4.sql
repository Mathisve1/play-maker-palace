
-- Monthly plans: a club creates a plan for a specific month
CREATE TABLE public.monthly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  contract_template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, year, month)
);

ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read monthly plans"
  ON public.monthly_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage monthly plans"
  ON public.monthly_plans FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Monthly plan tasks: individual day/task entries within a monthly plan
CREATE TABLE public.monthly_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.monthly_plans(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'algemeen',
  description text,
  location text,
  start_time time,
  end_time time,
  compensation_type text NOT NULL DEFAULT 'daily',
  daily_rate numeric,
  hourly_rate numeric,
  estimated_hours numeric,
  spots_available integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read monthly plan tasks"
  ON public.monthly_plan_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Club staff can manage monthly plan tasks"
  ON public.monthly_plan_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.monthly_plans mp
    WHERE mp.id = monthly_plan_tasks.plan_id
    AND has_club_role(auth.uid(), mp.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

-- Monthly enrollments: volunteer signs up for a monthly plan (1 contract per month)
CREATE TABLE public.monthly_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.monthly_plans(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  contract_status text NOT NULL DEFAULT 'pending',
  docuseal_submission_id integer,
  document_url text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, volunteer_id)
);

ALTER TABLE public.monthly_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can read own enrollments"
  ON public.monthly_enrollments FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can insert own enrollments"
  ON public.monthly_enrollments FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can update own enrollments"
  ON public.monthly_enrollments FOR UPDATE
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Club staff can manage enrollments"
  ON public.monthly_enrollments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.monthly_plans mp
    WHERE mp.id = monthly_enrollments.plan_id
    AND has_club_role(auth.uid(), mp.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

-- Monthly day signups: volunteer signs up for specific days within their enrollment
CREATE TABLE public.monthly_day_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.monthly_enrollments(id) ON DELETE CASCADE,
  plan_task_id uuid NOT NULL REFERENCES public.monthly_plan_tasks(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  ticket_barcode text,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  volunteer_reported_hours numeric,
  club_reported_hours numeric,
  volunteer_approved boolean NOT NULL DEFAULT false,
  club_approved boolean NOT NULL DEFAULT false,
  final_hours numeric,
  final_amount numeric,
  hour_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_task_id, volunteer_id)
);

ALTER TABLE public.monthly_day_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can read own day signups"
  ON public.monthly_day_signups FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can insert own day signups"
  ON public.monthly_day_signups FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can update own day signups"
  ON public.monthly_day_signups FOR UPDATE
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Club staff can manage day signups"
  ON public.monthly_day_signups FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.monthly_enrollments me
    JOIN public.monthly_plans mp ON mp.id = me.plan_id
    WHERE me.id = monthly_day_signups.enrollment_id
    AND has_club_role(auth.uid(), mp.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
  ));

-- Monthly payouts: bundled end-of-month payment
CREATE TABLE public.monthly_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.monthly_enrollments(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.monthly_plans(id) ON DELETE CASCADE,
  total_days integer NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);

ALTER TABLE public.monthly_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can read own payouts"
  ON public.monthly_payouts FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Club staff can manage payouts"
  ON public.monthly_payouts FOR ALL
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));
