-- Enum for club member roles
CREATE TYPE public.club_role AS ENUM ('bestuurder', 'beheerder', 'medewerker');

-- Club members table
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role club_role NOT NULL DEFAULT 'medewerker',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Club invitations table
CREATE TABLE public.club_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  email TEXT,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role club_role NOT NULL DEFAULT 'medewerker',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has a specific club role (or higher)
CREATE OR REPLACE FUNCTION public.has_club_role(_user_id UUID, _club_id UUID, _roles club_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id AND club_id = _club_id AND role = ANY(_roles)
  ) OR EXISTS (
    SELECT 1 FROM public.clubs
    WHERE id = _club_id AND owner_id = _user_id
  )
$$;

-- Insert the club owner as bestuurder for existing clubs
INSERT INTO public.club_members (club_id, user_id, role)
SELECT id, owner_id, 'bestuurder'::club_role FROM public.clubs
ON CONFLICT (club_id, user_id) DO NOTHING;

-- RLS: club_members
CREATE POLICY "Members can view own club members"
ON public.club_members FOR SELECT
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder', 'beheerder', 'medewerker']::club_role[])
);

CREATE POLICY "Bestuurder and beheerder can insert members"
ON public.club_members FOR INSERT
WITH CHECK (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder', 'beheerder']::club_role[])
);

CREATE POLICY "Bestuurder can update members"
ON public.club_members FOR UPDATE
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder']::club_role[])
);

CREATE POLICY "Bestuurder can delete members"
ON public.club_members FOR DELETE
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder']::club_role[])
);

CREATE POLICY "Admins can manage club_members"
ON public.club_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: club_invitations
CREATE POLICY "Club leaders can view invitations"
ON public.club_invitations FOR SELECT
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder', 'beheerder']::club_role[])
);

CREATE POLICY "Club leaders can create invitations"
ON public.club_invitations FOR INSERT
WITH CHECK (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder', 'beheerder']::club_role[])
);

CREATE POLICY "Club leaders can update invitations"
ON public.club_invitations FOR UPDATE
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder', 'beheerder']::club_role[])
);

CREATE POLICY "Club leaders can delete invitations"
ON public.club_invitations FOR DELETE
USING (
  has_club_role(auth.uid(), club_id, ARRAY['bestuurder']::club_role[])
);

CREATE POLICY "Admins can manage invitations"
ON public.club_invitations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_club_members_updated_at
BEFORE UPDATE ON public.club_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();