
-- Table to store spoed bonus offers per task
CREATE TABLE public.spoed_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  bonus_type TEXT NOT NULL DEFAULT 'bonus', -- 'bonus', 'double_points', 'both'
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (task_id)
);

ALTER TABLE public.spoed_bonuses ENABLE ROW LEVEL SECURITY;

-- Club owners/admins can manage spoed bonuses
CREATE POLICY "Club owners can manage spoed bonuses"
  ON public.spoed_bonuses
  FOR ALL
  TO authenticated
  USING (public.is_club_member(auth.uid(), club_id))
  WITH CHECK (public.is_club_member(auth.uid(), club_id));

-- Volunteers can read spoed bonuses (to see bonus info on tasks)
CREATE POLICY "Authenticated users can read spoed bonuses"
  ON public.spoed_bonuses
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger function: when a volunteer signs up for a task with a spoed bonus,
-- automatically create a payment record and/or credit loyalty points
CREATE OR REPLACE FUNCTION public.credit_spoed_bonus_on_signup()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_bonus RECORD;
  v_club_id UUID;
BEGIN
  -- Only on INSERT with status assigned or pending
  IF NEW.status NOT IN ('assigned', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Get club_id from task
  SELECT club_id INTO v_club_id FROM public.tasks WHERE id = NEW.task_id;
  IF v_club_id IS NULL THEN RETURN NEW; END IF;

  -- Check if there's an active spoed bonus for this task
  SELECT * INTO v_bonus
  FROM public.spoed_bonuses
  WHERE task_id = NEW.task_id AND is_active = true;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Credit monetary bonus (bonus or both)
  IF v_bonus.bonus_type IN ('bonus', 'both') AND v_bonus.bonus_amount > 0 THEN
    INSERT INTO public.volunteer_payments (
      task_id, club_id, volunteer_id, amount, currency, status
    ) VALUES (
      NEW.task_id, v_club_id, NEW.volunteer_id, v_bonus.bonus_amount, 'EUR', 'pending'
    );
  END IF;

  -- Credit double loyalty points (double_points or both)
  IF v_bonus.bonus_type IN ('double_points', 'both') THEN
    -- Get the task's loyalty points and double them
    DECLARE
      v_task_points INTEGER;
    BEGIN
      SELECT COALESCE(loyalty_points, 10) INTO v_task_points
      FROM public.tasks WHERE id = NEW.task_id;

      -- Insert extra loyalty points (the original points are handled elsewhere)
      INSERT INTO public.loyalty_points (user_id, club_id, points, reason)
      VALUES (
        NEW.volunteer_id, v_club_id, v_task_points,
        'Spoedbonus: dubbele punten'
      )
      ON CONFLICT DO NOTHING;
    END;
  END IF;

  -- Create notification for volunteer about bonus
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.volunteer_id,
    '🎉 Spoedbonus ontvangen!',
    CASE
      WHEN v_bonus.bonus_type = 'bonus' THEN '€' || v_bonus.bonus_amount || ' bonus toegevoegd aan je vergoedingen.'
      WHEN v_bonus.bonus_type = 'double_points' THEN 'Dubbele loyaliteitspunten voor deze taak!'
      ELSE '€' || v_bonus.bonus_amount || ' bonus + dubbele loyaliteitspunten!'
    END,
    'payment',
    jsonb_build_object('task_id', NEW.task_id, 'bonus_type', v_bonus.bonus_type, 'bonus_amount', v_bonus.bonus_amount)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_credit_spoed_bonus
  AFTER INSERT ON public.task_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_spoed_bonus_on_signup();
