
-- Create club_memberships table
CREATE TABLE public.club_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  club_role text NOT NULL DEFAULT 'medewerker',
  status text NOT NULL DEFAULT 'actief',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, club_id)
);

-- Enable RLS
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

-- Volunteers can read their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.club_memberships FOR SELECT
  TO authenticated
  USING (volunteer_id = auth.uid());

-- Club owners/admins can view memberships for their club
CREATE POLICY "Club admins can view club memberships"
  ON public.club_memberships FOR SELECT
  TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

-- Volunteers can insert their own membership
CREATE POLICY "Users can join clubs"
  ON public.club_memberships FOR INSERT
  TO authenticated
  WITH CHECK (volunteer_id = auth.uid());

-- Volunteers can update their own membership
CREATE POLICY "Users can update own memberships"
  ON public.club_memberships FOR UPDATE
  TO authenticated
  USING (volunteer_id = auth.uid());

-- Club owners can manage memberships
CREATE POLICY "Club admins can manage memberships"
  ON public.club_memberships FOR ALL
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder','beheerder']::club_role[]));

-- Add primary_club_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

-- Migrate existing club_members data (only those with existing profiles)
INSERT INTO public.club_memberships (volunteer_id, club_id, club_role, status)
SELECT cm.user_id, cm.club_id, cm.role::text, 'actief'
FROM public.club_members cm
WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cm.user_id)
ON CONFLICT (volunteer_id, club_id) DO NOTHING;
