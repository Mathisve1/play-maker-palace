
-- Create task_reviews table
CREATE TABLE public.task_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_signup_id UUID NOT NULL REFERENCES public.task_signups(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('club', 'volunteer')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_signup_id, reviewer_role)
);

-- Enable RLS
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

-- Volunteers can insert their own reviews
CREATE POLICY "Users can insert own reviews"
  ON public.task_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Users can read reviews where they are reviewer or reviewee
CREATE POLICY "Users can read relevant reviews"
  ON public.task_reviews FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());

-- Club owners can read reviews for their club's task signups
CREATE POLICY "Club owners can read club reviews"
  ON public.task_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_signups ts
      JOIN public.tasks t ON t.id = ts.task_id
      JOIN public.clubs c ON c.id = t.club_id
      WHERE ts.id = task_signup_id AND c.owner_id = auth.uid()
    )
  );

-- Club members can read reviews for their club
CREATE POLICY "Club members can read club reviews"
  ON public.task_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_signups ts
      JOIN public.tasks t ON t.id = ts.task_id
      WHERE ts.id = task_signup_id AND public.is_club_member(auth.uid(), t.club_id)
    )
  );
