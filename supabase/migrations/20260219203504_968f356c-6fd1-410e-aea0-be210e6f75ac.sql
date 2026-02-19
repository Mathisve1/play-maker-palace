
-- Create ticketing provider enum
CREATE TYPE public.ticketing_provider AS ENUM (
  'eventsquare', 'weezevent', 'eventbrite', 'ticketmaster_sport',
  'roboticket', 'tymes', 'eventix', 'yourticketprovider',
  'paylogic_seetickets', 'ticketmatic'
);

-- Create ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('none', 'sent', 'checked_in');

-- Ticketing configs table
CREATE TABLE public.ticketing_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  provider ticketing_provider NOT NULL,
  api_key text NOT NULL DEFAULT '',
  client_secret text DEFAULT '',
  event_id_external text DEFAULT '',
  webhook_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id)
);

ALTER TABLE public.ticketing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can read ticketing configs"
  ON public.ticketing_configs FOR SELECT
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club staff can insert ticketing configs"
  ON public.ticketing_configs FOR INSERT
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club staff can update ticketing configs"
  ON public.ticketing_configs FOR UPDATE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Club staff can delete ticketing configs"
  ON public.ticketing_configs FOR DELETE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE TRIGGER update_ticketing_configs_updated_at
  BEFORE UPDATE ON public.ticketing_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Volunteer tickets table
CREATE TABLE public.volunteer_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  volunteer_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  external_ticket_id text,
  ticket_url text,
  barcode text,
  status ticket_status NOT NULL DEFAULT 'none',
  checked_in_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can read volunteer tickets"
  ON public.volunteer_tickets FOR SELECT
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

CREATE POLICY "Club staff can insert volunteer tickets"
  ON public.volunteer_tickets FOR INSERT
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

CREATE POLICY "Club staff can update volunteer tickets"
  ON public.volunteer_tickets FOR UPDATE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

CREATE POLICY "Club staff can delete volunteer tickets"
  ON public.volunteer_tickets FOR DELETE
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

CREATE POLICY "Volunteers can read own tickets"
  ON public.volunteer_tickets FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE TRIGGER update_volunteer_tickets_updated_at
  BEFORE UPDATE ON public.volunteer_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for volunteer_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteer_tickets;

-- Ticketing logs table
CREATE TABLE public.ticketing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  volunteer_ticket_id uuid REFERENCES public.volunteer_tickets(id) ON DELETE SET NULL,
  action text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticketing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club staff can read ticketing logs"
  ON public.ticketing_logs FOR SELECT
  USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));

CREATE POLICY "Club staff can insert ticketing logs"
  ON public.ticketing_logs FOR INSERT
  WITH CHECK (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role, 'medewerker'::club_role]));
