
-- Table for volunteers to follow clubs
CREATE TABLE public.club_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_id)
);

-- Enable RLS
ALTER TABLE public.club_follows ENABLE ROW LEVEL SECURITY;

-- Users can read their own follows
CREATE POLICY "Users can read own follows"
ON public.club_follows FOR SELECT
USING (auth.uid() = user_id);

-- Users can follow clubs
CREATE POLICY "Users can follow clubs"
ON public.club_follows FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unfollow clubs
CREATE POLICY "Users can unfollow clubs"
ON public.club_follows FOR DELETE
USING (auth.uid() = user_id);

-- Club staff can see who follows their club (for stats)
CREATE POLICY "Club staff can read club followers"
ON public.club_follows FOR SELECT
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));
