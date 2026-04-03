ALTER TABLE public.club_invitations
ADD COLUMN IF NOT EXISTS partner_id uuid NULL,
ADD COLUMN IF NOT EXISTS partner_member_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_club_invitations_partner_id ON public.club_invitations(partner_id);
CREATE INDEX IF NOT EXISTS idx_club_invitations_partner_member_id ON public.club_invitations(partner_member_id);

ALTER TABLE public.club_invitations
DROP CONSTRAINT IF EXISTS club_invitations_partner_id_fkey;

ALTER TABLE public.club_invitations
ADD CONSTRAINT club_invitations_partner_id_fkey
FOREIGN KEY (partner_id) REFERENCES public.external_partners(id) ON DELETE SET NULL;

ALTER TABLE public.club_invitations
DROP CONSTRAINT IF EXISTS club_invitations_partner_member_id_fkey;

ALTER TABLE public.club_invitations
ADD CONSTRAINT club_invitations_partner_member_id_fkey
FOREIGN KEY (partner_member_id) REFERENCES public.partner_members(id) ON DELETE SET NULL;

WITH partner_admin_invites AS (
  SELECT ci.id, ep.id AS resolved_partner_id
  FROM public.club_invitations ci
  JOIN public.external_partners ep
    ON ep.club_id = ci.club_id
   AND lower(ep.contact_email) = lower(ci.email)
  WHERE ci.role = 'medewerker'
    AND ci.partner_id IS NULL
)
UPDATE public.club_invitations ci
SET role = 'partner_admin',
    partner_id = pai.resolved_partner_id
FROM partner_admin_invites pai
WHERE ci.id = pai.id;

WITH accepted_partner_admin_invites AS (
  SELECT ci.partner_id, p.id AS user_id, ci.invited_by
  FROM public.club_invitations ci
  JOIN public.profiles p
    ON lower(p.email) = lower(ci.email)
  WHERE ci.status = 'accepted'
    AND ci.role = 'partner_admin'
    AND ci.partner_id IS NOT NULL
)
INSERT INTO public.partner_admins (partner_id, user_id, invited_by)
SELECT apai.partner_id, apai.user_id, apai.invited_by
FROM accepted_partner_admin_invites apai
WHERE NOT EXISTS (
  SELECT 1
  FROM public.partner_admins pa
  WHERE pa.partner_id = apai.partner_id
    AND pa.user_id = apai.user_id
);