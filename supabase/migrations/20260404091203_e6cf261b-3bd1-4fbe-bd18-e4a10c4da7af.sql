
-- Fix 1: Restrict sensitive columns on profiles table via column-level grants
-- Revoke table-level SELECT from authenticated and anon
REVOKE SELECT ON public.profiles FROM authenticated, anon;

-- Grant SELECT on only safe (non-financial) columns to authenticated
GRANT SELECT (
  id, full_name, email, avatar_url, created_at, updated_at,
  phone, bio, language,
  push_notifications_enabled, in_app_notifications_enabled, push_prompt_seen,
  preferences, referral_code, referred_by, public_profile,
  primary_club_id, club_onboarding_step, city,
  first_tour_seen, compliance_blocked, linked_partner_id, date_of_birth
) ON public.profiles TO authenticated;

-- Grant SELECT on safe columns to anon (for public profile lookups)
GRANT SELECT (
  id, full_name, avatar_url, public_profile, city
) ON public.profiles TO anon;

-- Ensure service_role retains full access (for edge functions and RPCs)
GRANT ALL ON public.profiles TO service_role;

-- Fix 2: Restrict event_groups SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can read event_groups" ON public.event_groups;
CREATE POLICY "Authenticated can read event_groups" ON public.event_groups
  FOR SELECT TO authenticated USING (true);
