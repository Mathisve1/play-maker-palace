
-- Add dispute fields to monthly_day_signups
ALTER TABLE public.monthly_day_signups 
  ADD COLUMN IF NOT EXISTS dispute_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dispute_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS club_reported_checkout TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS volunteer_reported_checkout TIMESTAMPTZ;

-- Add dispute fields to hour_confirmations
ALTER TABLE public.hour_confirmations
  ADD COLUMN IF NOT EXISTS dispute_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dispute_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS club_reported_checkout TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS volunteer_reported_checkout TIMESTAMPTZ;
