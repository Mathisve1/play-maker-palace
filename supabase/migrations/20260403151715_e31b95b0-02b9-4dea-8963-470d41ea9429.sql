
-- Fix corrupted data: partner admin users should NOT have club_owner role
-- They should keep 'volunteer' in user_roles, and should NOT have stale club_members records
-- that were created by the old (buggy) else-branch of the edge function

-- Reset user_roles for partner admins back to 'volunteer' where incorrectly set to 'club_owner'
-- (only if they don't actually own a club)
UPDATE public.user_roles
SET role = 'volunteer'
WHERE user_id IN (
  SELECT pa.user_id FROM public.partner_admins pa
  WHERE NOT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.owner_id = pa.user_id
  )
)
AND role = 'club_owner';

-- Remove stale club_members records created by the buggy else-branch for partner admins
-- (only if they don't actually own the club and aren't genuine members)
DELETE FROM public.club_members
WHERE user_id IN (
  SELECT pa.user_id FROM public.partner_admins pa
  WHERE NOT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.owner_id = pa.user_id
  )
)
AND user_id NOT IN (
  SELECT volunteer_id FROM public.club_memberships WHERE status = 'actief'
);
