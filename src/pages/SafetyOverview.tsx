import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import ClubPageLayout from '@/components/ClubPageLayout';
import SafetyConfigDialog from '@/components/SafetyConfigDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CalendarDays, MapPin, ChevronRight, Loader2, History, Play, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface EventRow {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
  status: string;
}

const SafetyOverview = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const { clubId: contextClubId } = useClubContext();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (!contextClubId) { setLoading(false); return; }
    setClubId(contextClubId);

    (async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, location, status')
        .eq('club_id', contextClubId)
        .neq('status', 'on_hold')
        .order('event_date', { ascending: false });

      setEvents(data || []);
      setLoading(false);
    })();
  }, [contextClubId]);

  const now = new Date();
  const upcoming = useMemo(() => events.filter(e => !e.event_date || new Date(e.event_date) >= now), [events]);
  const past = useMemo(() => events.filter(e => e.event_date && new Date(e.event_date) < now), [events]);

  const handleStartDemo = async () => {
    if (!clubId) return;
    setDemoLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t3('Niet ingelogd', 'Non connecté', 'Not logged in'));

      const res = await supabase.functions.invoke('safety-demo', {
        body: { club_id: clubId },
      });

      if (res.error) throw res.error;
      const { event_id } = res.data;
      toast.success(t3('Demo scenario gestart! Incidenten verschijnen de komende 5 minuten.', 'Scénario démo lancé! Les incidents apparaîtront dans les 5 prochaines minutes.', 'Demo scenario started! Incidents will appear in the next 5 minutes.'));
      navigate(`/safety/${event_id}`);
    } catch (err: any) {
      toast.error(err.message || t3('Kon demo niet starten', 'Impossible de lancer la démo', 'Could not start demo'));
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDeleteDemo = async () => {
    if (!clubId) return;
    const { data: demoEvents } = await supabase
      .from('events')
      .select('id')
      .eq('club_id', clubId)
      .eq('title', 'Demo Veiligheidsdag 2026');

    if (!demoEvents?.length) {
      toast.info(t3('Geen demo evenementen gevonden.', 'Aucun événement démo trouvé.', 'No demo events found.'));
      return;
    }

    for (const ev of demoEvents) {
      await (supabase as any).from('safety_incidents').delete().eq('event_id', ev.id);
      await (supabase as any).from('safety_checklist_progress').delete().in(
        'checklist_item_id',
        (await (supabase as any).from('safety_checklist_items').select('id').eq('event_id', ev.id)).data?.map((i: any) => i.id) || []
      );
      await (supabase as any).from('safety_checklist_items').delete().eq('event_id', ev.id);
      await (supabase as any).from('safety_zones').delete().eq('event_id', ev.id);
      await supabase.from('events').delete().eq('id', ev.id);
    }

    setEvents(prev => prev.filter(e => e.title !== 'Demo Veiligheidsdag 2026'));
    toast.success(t3('Demo data verwijderd!', 'Données démo supprimées!', 'Demo data deleted!'));
  };

  const EventCard = ({ event, onClick }: { event: EventRow; onClick: () => void }) => (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-foreground truncate">{event.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {event.event_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}
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

  const hasDemoEvent = events.some(e => e.title === 'Demo Veiligheidsdag 2026');

  return (
    <ClubPageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Safety & Security</h1>
              <p className="text-sm text-muted-foreground">{t3('Kies een evenement', 'Choisissez un événement', 'Choose an event')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} disabled={!clubId} className="gap-1.5">
              <Settings className="w-4 h-4" /> {t3('Configuratie', 'Configuration', 'Configuration')}
            </Button>
            {hasDemoEvent && (
              <Button variant="outline" size="sm" onClick={handleDeleteDemo} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" /> {t3('Demo wissen', 'Supprimer démo', 'Delete demo')}
              </Button>
            )}
            <Button onClick={handleStartDemo} disabled={demoLoading || !clubId} size="sm" className="gap-1.5">
              {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {t3('Start Demo', 'Lancer démo', 'Start Demo')}
            </Button>
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
                {t3('Aankomend', 'À venir', 'Upcoming')} ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-4 h-4" />
                {t3('Historie', 'Historique', 'History')} ({past.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {renderGrid(upcoming, t3('Geen aankomende evenementen. Maak eerst een evenement aan in de Events Manager.', 'Aucun événement à venir. Créez d\'abord un événement.', 'No upcoming events. Create an event first in the Events Manager.'))}
            </TabsContent>
            <TabsContent value="history">
              {renderGrid(past, t3('Nog geen afgelopen evenementen.', 'Pas encore d\'événements passés.', 'No past events yet.'))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {showConfig && clubId && (
        <SafetyConfigDialog
          open={showConfig}
          onClose={() => setShowConfig(false)}
          eventId=""
          clubId={clubId}
        />
      )}
    </ClubPageLayout>
  );
};

export default SafetyOverview;
