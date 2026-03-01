import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, ArrowLeft, CalendarDays, MapPin, Loader2, Radio, ClipboardList } from 'lucide-react';

const SafetyEventHub = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<{ title: string; event_date: string | null; location: string | null; status: string; is_live: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      if (!eventId) return;
      const { data } = await (supabase as any)
        .from('events')
        .select('title, event_date, location, status, is_live')
        .eq('id', eventId)
        .maybeSingle();
      setEvent(data);
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ClubPageLayout>
    );
  }

  if (!event) {
    return (
      <ClubPageLayout>
        <div className="text-center py-24 text-muted-foreground">Evenement niet gevonden.</div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/safety')}>
            <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
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
          </div>
        </div>

        {/* Option cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Control Room */}
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => navigate(`/safety/${eventId}/control-room`)}
          >
            <CardContent className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Radio className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Control Room</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Live incidentenbeheer, zones monitoren, checklist en meldingen opvolgen in real-time.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Closing Procedure */}
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => navigate(`/safety/${eventId}/closing`)}
          >
            <CardContent className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <ClipboardList className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Sluitingsprocedure</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Terrein of stadion afsluiten met checklists, foto-verificatie en taakverdeling.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClubPageLayout>
  );
};

export default SafetyEventHub;
