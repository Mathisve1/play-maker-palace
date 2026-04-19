-- Voeg de correcte partner_admins koppeling toe voor mvaneeckhout@deloitte.com → deloitte vzw
INSERT INTO public.partner_admins (partner_id, user_id, invited_by)
VALUES (
  'ab4dc7a0-ff13-4b94-aafe-81c505558826'::uuid,
  '7551e850-1aa1-453c-922d-6d0cfc891a98'::uuid,
  '0d66233b-d936-49d8-9e83-181c1765cb7c'::uuid
)
ON CONFLICT (partner_id, user_id) DO NOTHING;

-- Markeer de pending uitnodigingen voor deze gebruiker als accepted (al verwerkt)
UPDATE public.club_invitations
SET status = 'accepted'
WHERE email = 'mvaneeckhout@deloitte.com'
  AND status = 'pending'
  AND partner_id = 'ab4dc7a0-ff13-4b94-aafe-81c505558826'::uuid;