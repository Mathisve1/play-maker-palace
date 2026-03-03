
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_id)
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dashboard layout"
ON public.dashboard_layouts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard layout"
ON public.dashboard_layouts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard layout"
ON public.dashboard_layouts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dashboard layout"
ON public.dashboard_layouts FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_dashboard_layouts_updated_at
BEFORE UPDATE ON public.dashboard_layouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
