
-- Add club onboarding step to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS club_onboarding_step text NOT NULL DEFAULT 'welcome';
