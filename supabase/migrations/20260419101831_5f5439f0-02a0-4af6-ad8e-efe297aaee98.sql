
-- Voeg de ontbrekende partner_admins-rij toe voor de gebruiker die de invite heeft geaccepteerd
-- maar wegens een silent failure niet als partner-admin werd geregistreerd.
INSERT INTO public.partner_admins (partner_id, user_id, invited_by)
SELECT 
  '425dc139-3215-4d4d-bc2f-7f001ceda373'::uuid,
  p.id,
  (SELECT owner_id FROM public.clubs WHERE id = 'a06fa3d7-ca0a-48a5-9269-9c0a0ffdc1a3'::uuid)
FROM public.profiles p
WHERE p.email = 'mvaneeckhout@deloitte.com'
ON CONFLICT (partner_id, user_id) DO NOTHING;
