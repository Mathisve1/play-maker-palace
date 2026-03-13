
-- Volunteer reviews (after shift completion)
CREATE TABLE public.volunteer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, volunteer_id)
);

ALTER TABLE public.volunteer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers manage own reviews"
  ON public.volunteer_reviews FOR ALL TO authenticated
  USING (volunteer_id = auth.uid())
  WITH CHECK (volunteer_id = auth.uid());

CREATE POLICY "Clubs read reviews"
  ON public.volunteer_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = volunteer_reviews.club_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

-- Referral system
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referral_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  status TEXT NOT NULL DEFAULT 'pending',
  bonus_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own referrals"
  ON public.referrals FOR ALL TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid())
  WITH CHECK (referrer_id = auth.uid());

-- Live event feed
CREATE TABLE public.event_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'update',
  title TEXT,
  content TEXT NOT NULL,
  photo_url TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_feed ENABLE ROW LEVEL SECURITY;

-- Club admins can write feed items
CREATE POLICY "Club admins write event feed"
  ON public.event_feed FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_feed.event_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), e.club_id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

-- All assigned volunteers + club admins can read
CREATE POLICY "Event participants read feed"
  ON public.event_feed FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_signups ts
      JOIN public.tasks t ON t.id = ts.task_id
      WHERE t.event_id = event_feed.event_id
        AND ts.volunteer_id = auth.uid()
        AND ts.status = 'assigned'
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_feed.event_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), e.club_id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.event_feed;

-- Break/pause tracking
CREATE TABLE public.volunteer_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT
);

ALTER TABLE public.volunteer_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers manage own breaks"
  ON public.volunteer_breaks FOR ALL TO authenticated
  USING (volunteer_id = auth.uid())
  WITH CHECK (volunteer_id = auth.uid());

CREATE POLICY "Clubs read volunteer breaks"
  ON public.volunteer_breaks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.clubs c ON c.id = t.club_id
      WHERE t.id = volunteer_breaks.task_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

-- Skills passport: skills table
CREATE TABLE public.volunteer_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'beginner',
  source TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own skills"
  ON public.volunteer_skills FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public read skills"
  ON public.volunteer_skills FOR SELECT TO public USING (true);

-- Micro-learnings
CREATE TABLE public.micro_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'quiz',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_minutes INT NOT NULL DEFAULT 2,
  skill_tag TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.micro_learning_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_id UUID NOT NULL REFERENCES public.micro_learnings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(learning_id, user_id)
);

ALTER TABLE public.micro_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_learning_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published learnings"
  ON public.micro_learnings FOR SELECT TO public USING (is_published = true);

CREATE POLICY "Club admins manage learnings"
  ON public.micro_learnings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = micro_learnings.club_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = micro_learnings.club_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), c.id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

CREATE POLICY "Users manage own completions"
  ON public.micro_learning_completions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add referral_code to profiles for sharing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT false;
