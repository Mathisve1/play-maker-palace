
-- Add referral bonus points setting to clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS referral_bonus_points integer NOT NULL DEFAULT 0;

-- Club referrals table: tracks who referred whom to which club
CREATE TABLE public.club_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  bonus_points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(club_id, referred_id)
);

ALTER TABLE public.club_referrals ENABLE ROW LEVEL SECURITY;

-- Volunteers can see their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals" ON public.club_referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Authenticated users can insert referrals (when following a club with a code)
CREATE POLICY "Users can create referrals" ON public.club_referrals
  FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());

-- Allow update for completing referrals (service role will handle this, but also allow referrer to see updates)
CREATE POLICY "System can update referrals" ON public.club_referrals
  FOR UPDATE TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());
