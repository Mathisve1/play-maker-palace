-- Create task_likes table for interest/likes
CREATE TABLE public.task_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_likes ENABLE ROW LEVEL SECURITY;

-- Users can see all likes (to show counts)
CREATE POLICY "Anyone can read likes"
  ON public.task_likes FOR SELECT
  USING (true);

-- Users can like tasks
CREATE POLICY "Users can like tasks"
  ON public.task_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike own likes"
  ON public.task_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all likes
CREATE POLICY "Admins can manage likes"
  ON public.task_likes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
