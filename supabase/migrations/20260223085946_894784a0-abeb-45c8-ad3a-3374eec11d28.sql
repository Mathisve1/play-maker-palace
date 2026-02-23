
-- Add onesignal_player_id to profiles for targeted push notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onesignal_player_id text;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id ON public.profiles (onesignal_player_id) WHERE onesignal_player_id IS NOT NULL;
