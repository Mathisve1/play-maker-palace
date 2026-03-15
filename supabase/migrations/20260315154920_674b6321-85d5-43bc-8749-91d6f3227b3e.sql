ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tasks_updated_at();