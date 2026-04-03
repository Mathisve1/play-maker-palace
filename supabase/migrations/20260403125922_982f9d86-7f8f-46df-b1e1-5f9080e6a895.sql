
-- Fix: Move stripe_account_id from clubs to a separate restricted table
CREATE TABLE IF NOT EXISTS public.club_stripe_settings (
  club_id uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  stripe_account_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_stripe_settings ENABLE ROW LEVEL SECURITY;

-- Only club owners can read/write their stripe settings
CREATE POLICY "Club owners can read own stripe settings"
ON public.club_stripe_settings FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_stripe_settings.club_id AND owner_id = auth.uid())
  OR has_club_role(auth.uid(), club_stripe_settings.club_id, ARRAY['bestuurder'::club_role])
);

CREATE POLICY "Club owners can update own stripe settings"
ON public.club_stripe_settings FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_stripe_settings.club_id AND owner_id = auth.uid())
);

CREATE POLICY "Club owners can insert own stripe settings"
ON public.club_stripe_settings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_stripe_settings.club_id AND owner_id = auth.uid())
);

-- Migrate existing data
INSERT INTO public.club_stripe_settings (club_id, stripe_account_id)
SELECT id, stripe_account_id FROM public.clubs WHERE stripe_account_id IS NOT NULL
ON CONFLICT (club_id) DO NOTHING;

-- Drop the column from clubs table  
ALTER TABLE public.clubs DROP COLUMN IF EXISTS stripe_account_id;

-- Recreate clubs_safe view without stripe_account_id (it was already excluded but let's ensure consistency)
CREATE OR REPLACE VIEW public.clubs_safe AS
SELECT id, name, description, location, logo_url, sport, owner_id, allow_shift_swaps, created_at
FROM public.clubs;
ALTER VIEW public.clubs_safe SET (security_invoker = on);
