
-- Drop type if partially created
DROP TYPE IF EXISTS public.onboarding_step;

CREATE TYPE public.onboarding_step AS ENUM ('profile_complete', 'contract_signed', 'training_done', 'first_task');

CREATE TABLE public.club_onboarding_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  step onboarding_step NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, step)
);

ALTER TABLE public.club_onboarding_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owners can manage onboarding config"
  ON public.club_onboarding_config FOR ALL
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Members can read onboarding config"
  ON public.club_onboarding_config FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.club_members WHERE user_id = auth.uid() AND club_id = club_onboarding_config.club_id
  ));

CREATE TABLE public.volunteer_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  step onboarding_step NOT NULL,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_id, step)
);

ALTER TABLE public.volunteer_onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding steps"
  ON public.volunteer_onboarding_steps FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Club admins can read member onboarding"
  ON public.volunteer_onboarding_steps FOR SELECT
  TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));
