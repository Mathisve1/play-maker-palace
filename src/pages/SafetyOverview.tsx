import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CalendarDays, MapPin, ChevronRight, Loader2, History } from 'lucide-react';

interface EventRow {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
  status: string;
}

const EventCard = ({ event, onClick }: { event: EventRow; onClick: () => void }) => (
  <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
    <CardContent className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-foreground truncate">{event.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {event.event_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {new Date(event.event_date).toLocaleDateString('nl-BE')}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
          )}
        </div>
      </div>
      <Badge variant={event.status === 'open' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
        {event.status}
      </Badge>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </CardContent>
  </Card>
);

const SafetyOverview = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: membership } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (!membership) { setLoading(false); return; }

      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, location, status')
        .eq('club_id', membership.club_id)
        .neq('status', 'on_hold')
        .order('event_date', { ascending: false });

      setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const upcoming = useMemo(() => events.filter(e => !e.event_date || new Date(e.event_date) >= now), [events]);
  const past = useMemo(() => events.filter(e => e.event_date && new Date(e.event_date) < now), [events]);

  const renderGrid = (list: EventRow[], emptyMsg: string) =>
    list.length === 0 ? (
      <Card><CardContent className="py-12 text-center text-muted-foreground">{emptyMsg}</CardContent></Card>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(event => (
          <EventCard key={event.id} event={event} onClick={() => navigate(`/safety/${event.id}`)} />
        ))}
      </div>
    );

  return (
    <ClubPageLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Safety & Security</h1>
            <p className="text-sm text-muted-foreground">Kies een evenement om de control room te openen</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming" className="gap-1.5">
                <CalendarDays className="w-4 h-4" />
                Aankomend ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-4 h-4" />
                Historie ({past.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {renderGrid(upcoming, 'Geen aankomende evenementen. Maak eerst een evenement aan in de Events Manager.')}
            </TabsContent>
            <TabsContent value="history">
              {renderGrid(past, 'Nog geen afgelopen evenementen.')}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ClubPageLayout>
  );
};

export default SafetyOverview;
