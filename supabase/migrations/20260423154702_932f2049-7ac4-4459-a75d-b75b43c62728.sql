-- Grant club_owner role to UGent demo account so login redirects to /club-dashboard
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'club_owner'::app_role
FROM public.profiles
WHERE email = 'ugent@de12eman.be'
ON CONFLICT (user_id, role) DO NOTHING;