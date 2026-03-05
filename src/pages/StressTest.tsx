import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOptionalClubContext } from '@/contexts/ClubContext';
import ClubPageLayout from '@/components/ClubPageLayout';
import { toast } from 'sonner';
import { Zap, Trash2, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface PhaseResult {
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
  ops_per_second: number;
}

interface StressResults {
  volunteer_count: number;
  phases: {
    checklist_completions?: PhaseResult;
    realtime_broadcasts?: PhaseResult;
    incident_reports?: PhaseResult;
    status_updates?: PhaseResult;
  };
  summary?: {
    total_operations: number;
    total_duration_ms: number;
    overall_ops_per_second: number;
    verdict: string;
  };
}

interface EventOption {
  id: string;
  title: string;
  club_id: string;
}

const StressTestContent = () => {
  const navigate = useNavigate();
  const clubCtx = useOptionalClubContext();
  const clubId = clubCtx?.clubId;
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [results, setResults] = useState<StressResults | null>(null);
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      if (!clubId) {
        setEvents([]);
        setEventId('');
        setLoadingEvents(false);
        return;
      }

      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, club_id')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        toast.error(`Events laden mislukt: ${error.message}`);
        setEvents([]);
        setEventId('');
        setLoadingEvents(false);
        return;
      }

      const loadedEvents = data || [];
      setEvents(loadedEvents);
      setEventId(prev => (loadedEvents.some(ev => ev.id === prev) ? prev : loadedEvents[0]?.id || ''));
      setLoadingEvents(false);
    };

    loadEvents();
  }, [clubId]);

  const runTest = async () => {
    if (!clubId || !eventId) return;
    setRunning(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      const resp = await supabase.functions.invoke('stress-test', {
        body: { club_id: clubId, event_id: eventId },
      });

      if (resp.error) throw new Error(resp.error.message);
      setResults(resp.data as StressResults);
      toast.success('Stress test voltooid!');
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const cleanup = async () => {
    if (!clubId) return;
    setCleaning(true);
    try {
      await supabase.functions.invoke('stress-test', {
        body: { club_id: clubId, action: 'cleanup' },
      });
      toast.success('Stress-test data opgeruimd');
      setResults(null);
    } catch (err: any) {
      toast.error(`Opruimen mislukt: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const PhaseCard = ({ title, data }: { title: string; data?: PhaseResult }) => {
    if (!data) return null;
    const successRate = Math.round((data.succeeded / data.total) * 100);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Succes</span>
            <span className="font-mono font-bold">{data.succeeded}/{data.total}</span>
          </div>
          <Progress value={successRate} className="h-2" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Tijd</span>
              <p className="font-mono font-semibold">{(data.duration_ms / 1000).toFixed(2)}s</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ops/sec</span>
              <p className="font-mono font-semibold">{data.ops_per_second}</p>
            </div>
          </div>
          {data.failed > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {data.failed} gefaald
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!clubId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Geen club gevonden. Log in als club-eigenaar.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Stress Test — 450 Vrijwilligers</h1>
          <p className="text-sm text-muted-foreground">
            Simuleert 450 gelijktijdige checklist-updates, realtime broadcasts, incident-meldingen en status-updates.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Selecteer event</label>
            <p className="text-xs text-muted-foreground mb-1">
              Kies een bestaand safety-event om de stress test op uit te voeren
            </p>
            {loadingEvents ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Events laden...
              </div>
            ) : (
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              >
                <option value="">— Kies een event —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={runTest} disabled={running || !eventId} className="gap-2">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {running ? 'Test loopt...' : 'Start stress test'}
            </Button>
            <Button variant="outline" onClick={cleanup} disabled={cleaning} className="gap-2">
              {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Opruimen
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhaseCard title="📋 Checklist completions (450x)" data={results.phases.checklist_completions} />
            <PhaseCard title="📡 Realtime broadcasts (450x)" data={results.phases.realtime_broadcasts} />
            <PhaseCard title="🚨 Incident reports (100x)" data={results.phases.incident_reports} />
            <PhaseCard title="🔄 Status updates (200x)" data={results.phases.status_updates} />
          </div>

          {results.summary && (
            <Card className={
              results.summary.verdict.startsWith('✅') ? 'border-emerald-500/50' :
              results.summary.verdict.startsWith('⚠️') ? 'border-yellow-500/50' :
              'border-destructive/50'
            }>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  {results.summary.verdict.startsWith('✅') ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> :
                   results.summary.verdict.startsWith('⚠️') ? <AlertTriangle className="w-6 h-6 text-yellow-500" /> :
                   <XCircle className="w-6 h-6 text-destructive" />}
                  <p className="text-sm font-bold text-foreground">{results.summary.verdict}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Totaal operaties</span>
                    <p className="font-mono font-bold text-lg">{results.summary.total_operations}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Totale tijd</span>
                    <p className="font-mono font-bold text-lg">{(results.summary.total_duration_ms / 1000).toFixed(1)}s</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ops/sec</span>
                    <p className="font-mono font-bold text-lg">{results.summary.overall_ops_per_second}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const StressTest = () => (
  <ClubPageLayout>
    <StressTestContent />
  </ClubPageLayout>
);

export default StressTest;
