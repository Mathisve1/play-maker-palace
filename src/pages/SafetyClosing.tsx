import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ClubPageLayout from '@/components/ClubPageLayout';
import ClosingProcedureManager from '@/components/safety/ClosingProcedureManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react';

const SafetyClosing = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [eventClosed, setEventClosed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!eventId) return;
      const { data: ev } = await (supabase as any)
        .from('events')
        .select('club_id, title, is_live, status')
        .eq('id', eventId)
        .maybeSingle();
      if (!ev) { navigate('/safety'); return; }
      setClubId(ev.club_id);
      setEventTitle(ev.title);
      setIsLive(ev.is_live ?? false);
      setEventClosed(ev.status === 'closed');
      setLoading(false);
    })();
  }, [eventId, navigate]);

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate(`/safety/${eventId}`)}>
            <ArrowLeft className="w-4 h-4" /> Terug
          </Button>
          <div className="flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sluitingsprocedure</h1>
              <p className="text-sm text-muted-foreground">{eventTitle}</p>
            </div>
          </div>
        </div>

        {clubId && eventId && (
          <ClosingProcedureManager
            clubId={clubId}
            eventId={eventId}
            isLive={isLive}
            eventClosed={eventClosed}
          />
        )}
      </div>
    </ClubPageLayout>
  );
};

export default SafetyClosing;
