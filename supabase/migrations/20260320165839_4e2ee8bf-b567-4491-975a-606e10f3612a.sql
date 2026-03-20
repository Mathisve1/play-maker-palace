
CREATE TABLE public.club_reward_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  free_drinks_enabled BOOLEAN NOT NULL DEFAULT false,
  free_drinks_per_shift INTEGER NOT NULL DEFAULT 2,
  fanshop_credit_enabled BOOLEAN NOT NULL DEFAULT false,
  fanshop_credit_per_shift NUMERIC(6,2) NOT NULL DEFAULT 2.50,
  free_coffee_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id)
);

ALTER TABLE public.club_reward_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owners can manage reward settings"
  ON public.club_reward_settings
  FOR ALL
  TO authenticated
  USING (public.is_club_member(auth.uid(), club_id))
  WITH CHECK (public.is_club_member(auth.uid(), club_id));

CREATE TRIGGER set_updated_at_club_reward_settings
  BEFORE UPDATE ON public.club_reward_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
