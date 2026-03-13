
-- Fase B: Task notes & photos
CREATE TABLE public.task_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL,
  content TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- Volunteers can CRUD their own notes
CREATE POLICY "Volunteers manage own task notes"
  ON public.task_notes FOR ALL TO authenticated
  USING (volunteer_id = auth.uid())
  WITH CHECK (volunteer_id = auth.uid());

-- Club owners/admins can read notes for their tasks
CREATE POLICY "Club can read task notes"
  ON public.task_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.clubs c ON c.id = t.club_id
      WHERE t.id = task_notes.task_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), t.club_id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

-- Storage bucket for task note photos
INSERT INTO storage.buckets (id, name, public) VALUES ('task-notes-photos', 'task-notes-photos', true);

CREATE POLICY "Authenticated users upload task note photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-notes-photos');

CREATE POLICY "Anyone can view task note photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'task-notes-photos');

CREATE POLICY "Users delete own task note photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-notes-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Fase C: Certificate verification columns
ALTER TABLE public.volunteer_certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.volunteer_certificates ADD COLUMN IF NOT EXISTS verification_code TEXT;

-- Fase D: Calendar tokens
CREATE TABLE public.calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar tokens"
  ON public.calendar_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fase E: Badges
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name_nl TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_nl TEXT,
  description_fr TEXT,
  description_en TEXT,
  icon TEXT NOT NULL DEFAULT 'award',
  condition_type TEXT NOT NULL,
  threshold INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.volunteer_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read badge definitions"
  ON public.badge_definitions FOR SELECT TO public USING (true);

CREATE POLICY "Users read own badges"
  ON public.volunteer_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System inserts badges"
  ON public.volunteer_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anyone can view badges (for profile views)
CREATE POLICY "Public read badges"
  ON public.volunteer_badges FOR SELECT TO public USING (true);

-- Fase F: Event group chat
CREATE TABLE public.event_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_chats ENABLE ROW LEVEL SECURITY;

-- Only assigned volunteers can read/write event chats
CREATE POLICY "Event participants read chat"
  ON public.event_chats FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_signups ts
      JOIN public.tasks t ON t.id = ts.task_id
      WHERE t.event_id = event_chats.event_id
        AND ts.volunteer_id = auth.uid()
        AND ts.status = 'assigned'
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_chats.event_id
        AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), e.club_id, ARRAY['bestuurder','beheerder']::club_role[]))
    )
  );

CREATE POLICY "Event participants write chat"
  ON public.event_chats FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.task_signups ts
        JOIN public.tasks t ON t.id = ts.task_id
        WHERE t.event_id = event_chats.event_id
          AND ts.volunteer_id = auth.uid()
          AND ts.status = 'assigned'
      )
      OR EXISTS (
        SELECT 1 FROM public.events e
        JOIN public.clubs c ON c.id = e.club_id
        WHERE e.id = event_chats.event_id
          AND (c.owner_id = auth.uid() OR public.has_club_role(auth.uid(), e.club_id, ARRAY['bestuurder','beheerder']::club_role[]))
      )
    )
  );

-- Enable realtime for event chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_chats;

-- Seed badge definitions
INSERT INTO public.badge_definitions (key, name_nl, name_fr, name_en, description_nl, description_fr, description_en, icon, condition_type, threshold) VALUES
  ('first_task', 'Eerste Taak', 'Première Tâche', 'First Task', 'Je eerste vrijwilligerstaak voltooid', 'Votre première tâche bénévole terminée', 'Completed your first volunteer task', 'star', 'tasks_completed', 1),
  ('tasks_10', '10 Taken', '10 Tâches', '10 Tasks', '10 taken succesvol afgerond', '10 tâches terminées avec succès', '10 tasks successfully completed', 'trophy', 'tasks_completed', 10),
  ('tasks_50', '50 Taken', '50 Tâches', '50 Tasks', '50 taken succesvol afgerond', '50 tâches terminées avec succès', '50 tasks successfully completed', 'medal', 'tasks_completed', 50),
  ('tasks_100', '100 Taken', '100 Tâches', '100 Tasks', 'Een ware held — 100 taken!', 'Un vrai héros — 100 tâches !', 'A true hero — 100 tasks!', 'crown', 'tasks_completed', 100),
  ('hours_50', '50 Uren', '50 Heures', '50 Hours', '50 uur vrijwilligerswerk', '50 heures de bénévolat', '50 hours of volunteering', 'clock', 'hours_worked', 50),
  ('hours_100', '100 Uren', '100 Heures', '100 Hours', '100 uur vrijwilligerswerk', '100 heures de bénévolat', '100 hours of volunteering', 'hourglass', 'hours_worked', 100),
  ('clubs_3', 'Clubhopper', 'Clubhopper', 'Club Hopper', 'Bij 3 verschillende clubs geholpen', 'Aidé dans 3 clubs différents', 'Helped at 3 different clubs', 'users', 'clubs_helped', 3),
  ('clubs_5', 'Netwerker', 'Réseauteur', 'Networker', 'Bij 5 verschillende clubs geholpen', 'Aidé dans 5 clubs différents', 'Helped at 5 different clubs', 'globe', 'clubs_helped', 5),
  ('night_owl', 'Nachtuil', 'Oiseau de Nuit', 'Night Owl', 'Een nachtshift voltooid (na 22:00)', 'Terminé un quart de nuit (après 22h)', 'Completed a night shift (after 10 PM)', 'moon', 'night_shift', 1),
  ('weekend_warrior', 'Weekendstrijder', 'Guerrier du Weekend', 'Weekend Warrior', '10 weekendtaken voltooid', '10 tâches du weekend terminées', '10 weekend tasks completed', 'zap', 'weekend_tasks', 10);
