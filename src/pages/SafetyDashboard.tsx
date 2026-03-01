import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Radio, Maximize2, Minimize2,
  Phone, ChevronRight, Clock, MapPin, Volume2, VolumeX, RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClubPageLayout from '@/components/ClubPageLayout';

// Types
interface SafetyZone {
  id: string; name: string; status: string; color: string; event_id: string; club_id: string;
}
interface SafetyIncidentType {
  id: string; label: string; icon: string; color: string; default_priority: string; club_id: string;
}
interface SafetyIncident {
  id: string; event_id: string; club_id: string; incident_type_id: string | null;
  zone_id: string | null; reporter_id: string; description: string | null;
  lat: number | null; lng: number | null; status: string; priority: string;
  created_at: string; updated_at: string; resolved_by: string | null; resolved_at: string | null;
}
interface ChecklistItem {
  id: string; description: string; zone_id: string | null; event_id: string;
}
interface ChecklistProgress {
  id: string; checklist_item_id: string; volunteer_id: string; is_completed: boolean;
}

// ── Alarm sound helper ──
const playAlarm = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
  } catch { /* silent fallback */ }
};

const SafetyDashboard = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<SafetyIncidentType[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [flashRed, setFlashRed] = useState(false);
  const [zoneFullscreen, setZoneFullscreen] = useState(false);
  const [incidentFullscreen, setIncidentFullscreen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const incidentRef = useRef<HTMLDivElement>(null);

  const toggleBrowserFullscreen = (ref: React.RefObject<HTMLDivElement | null>, entering: boolean) => {
    if (entering && ref.current) {
      ref.current.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setZoneFullscreen(false);
        setIncidentFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Steward state
  const [showIncidentGrid, setShowIncidentGrid] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<SafetyIncidentType | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [reporting, setReporting] = useState(false);

  const flashTimeout = useRef<NodeJS.Timeout>();

  // ── Load data ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !eventId) { navigate('/login'); return; }
      setUserId(session.user.id);

      // Get event + club
      const { data: ev } = await (supabase as any).from('events').select('id, club_id, title').eq('id', eventId).maybeSingle();
      if (!ev) { navigate('/events-manager'); return; }
      setClubId(ev.club_id);
      setEventTitle(ev.title);

      // Check if staff
      const { data: owned } = await supabase.from('clubs').select('id').eq('id', ev.club_id).eq('owner_id', session.user.id);
      const { data: member } = await (supabase as any).from('club_members').select('role').eq('club_id', ev.club_id).eq('user_id', session.user.id).maybeSingle();
      const staff = !!(owned?.length) || ['bestuurder', 'beheerder'].includes(member?.role || '');
      setIsStaff(staff);

      // Load all data in parallel
      const [zRes, itRes, incRes, clRes, cpRes] = await Promise.all([
        (supabase as any).from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_incident_types').select('*').eq('club_id', ev.club_id).order('sort_order'),
        (supabase as any).from('safety_incidents').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        (supabase as any).from('safety_checklist_items').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_checklist_progress').select('*').eq('volunteer_id', session.user.id),
      ]);
      setZones(zRes.data || []);
      setIncidentTypes(itRes.data || []);
      setIncidents(incRes.data || []);
      setChecklistItems(clRes.data || []);
      setChecklistProgress(cpRes.data || []);
      setLoading(false);
    };
    init();
  }, [eventId, navigate]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`safety-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_incidents', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const inc = payload.new as SafetyIncident;
            setIncidents(prev => [inc, ...prev]);
            if (inc.priority === 'high') {
              if (audioEnabled) playAlarm();
              setFlashRed(true);
              if (flashTimeout.current) clearTimeout(flashTimeout.current);
              flashTimeout.current = setTimeout(() => setFlashRed(false), 2000);
            }
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new as SafetyIncident : i));
          } else if (payload.eventType === 'DELETE') {
            setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_zones', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            setZones(prev => prev.map(z => z.id === payload.new.id ? payload.new as SafetyZone : z));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_checklist_progress' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setChecklistProgress(prev => [...prev, payload.new as ChecklistProgress]);
          } else if (payload.eventType === 'UPDATE') {
            setChecklistProgress(prev => prev.map(p => p.id === payload.new.id ? payload.new as ChecklistProgress : p));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, audioEnabled]);

  // ── Steward: toggle checklist ──
  const handleToggleChecklist = async (itemId: string) => {
    if (!userId) return;
    const existing = checklistProgress.find(p => p.checklist_item_id === itemId && p.volunteer_id === userId);
    if (existing) {
      const newVal = !existing.is_completed;
      await (supabase as any).from('safety_checklist_progress').update({
        is_completed: newVal, completed_at: newVal ? new Date().toISOString() : null,
      }).eq('id', existing.id);
      setChecklistProgress(prev => prev.map(p => p.id === existing.id ? { ...p, is_completed: newVal } : p));
    } else {
      const { data } = await (supabase as any).from('safety_checklist_progress').insert({
        checklist_item_id: itemId, volunteer_id: userId, is_completed: true, completed_at: new Date().toISOString(),
      }).select('*').maybeSingle();
      if (data) setChecklistProgress(prev => [...prev, data]);
    }
  };

  // ── Steward: report incident (2-click) ──
  const handleReportIncident = async () => {
    if (!selectedIncidentType || !eventId || !clubId || !userId) return;
    setReporting(true);
    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch { /* GPS unavailable */ }

    const { error } = await (supabase as any).from('safety_incidents').insert({
      event_id: eventId, club_id: clubId, incident_type_id: selectedIncidentType.id,
      zone_id: selectedZoneId || null, reporter_id: userId, description: incidentDesc.trim() || null,
      lat, lng, priority: selectedIncidentType.default_priority, status: 'nieuw',
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Incident gemeld!');
      setShowIncidentGrid(false);
      setSelectedIncidentType(null);
      setSelectedZoneId('');
      setIncidentDesc('');
    }
    setReporting(false);
  };

  // ── Control room: update incident ──
  const handleUpdateIncident = async (incidentId: string, status: string) => {
    await (supabase as any).from('safety_incidents').update({
      status, updated_at: new Date().toISOString(),
      ...(status === 'opgelost' ? { resolved_by: userId, resolved_at: new Date().toISOString() } : {}),
    }).eq('id', incidentId);
  };

  // ── Control room: update zone status ──
  const handleUpdateZone = async (zoneId: string, status: string) => {
    const color = status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#22c55e';
    await (supabase as any).from('safety_zones').update({ status, color }).eq('id', zoneId);
  };

  const isItemCompleted = (itemId: string) => checklistProgress.some(p => p.checklist_item_id === itemId && p.volunteer_id === userId && p.is_completed);
  const completedCount = checklistItems.filter(i => isItemCompleted(i.id)).length;

  const activeIncidents = incidents.filter(i => i.status !== 'opgelost');
  const highPriorityCount = activeIncidents.filter(i => i.priority === 'high').length;

  const getIncidentTypeName = (typeId: string | null) => incidentTypes.find(t => t.id === typeId)?.label || 'Onbekend';
  const getZoneName = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.name || '—';

  const priorityColor = (p: string) => p === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : p === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  const statusColor = (s: string) => s === 'nieuw' ? 'bg-red-500' : s === 'bezig' ? 'bg-amber-500' : 'bg-emerald-500';

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // STEWARD VIEW (mobile first, light mode)
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-foreground truncate">{eventTitle}</span>
          </div>
          <Badge variant="outline" className="text-xs">{completedCount}/{checklistItems.length}</Badge>
        </header>

        <div className="p-4 pb-32 space-y-6">
          {/* Checklist */}
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Checklist
            </h2>
            <div className="space-y-2">
              <AnimatePresence>
                {checklistItems.map(item => {
                  const done = isItemCompleted(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      onClick={() => handleToggleChecklist(item.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all min-h-[56px] ${done ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-card border-border hover:border-primary/30'}`}
                    >
                      <motion.div
                        animate={{ scale: done ? 1.2 : 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}
                      >
                        {done && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </motion.div>
                      <span className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.description}
                      </span>
                      {item.zone_id && (
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">{getZoneName(item.zone_id)}</Badge>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
              {checklistItems.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-6">Geen checklist items voor dit evenement.</p>
              )}
            </div>
          </div>
        </div>

        {/* Floating incident button */}
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <AnimatePresence mode="wait">
            {!showIncidentGrid && !selectedIncidentType && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                <Button
                  onClick={() => setShowIncidentGrid(true)}
                  className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground shadow-lg text-base font-bold gap-2"
                >
                  <AlertTriangle className="w-5 h-5" /> Incident melden
                </Button>
              </motion.div>
            )}

            {showIncidentGrid && !selectedIncidentType && (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bg-card rounded-2xl border border-border shadow-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-foreground">Kies type</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowIncidentGrid(false)}><Minimize2 className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {incidentTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedIncidentType(type)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 bg-background transition-all active:scale-95 min-h-[80px]"
                      style={{ borderColor: type.color + '40' }}
                    >
                      <AlertTriangle className="w-6 h-6" style={{ color: type.color }} />
                      <span className="text-xs font-medium text-foreground text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
                {incidentTypes.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Geen incident types geconfigureerd.</p>}
              </motion.div>
            )}

            {selectedIncidentType && (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bg-card rounded-2xl border border-border shadow-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" style={{ color: selectedIncidentType.color }} />
                    <span className="font-heading font-bold text-foreground">{selectedIncidentType.label}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedIncidentType(null); setShowIncidentGrid(true); }}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
                </div>

                {zones.length > 0 && (
                  <select
                    value={selectedZoneId}
                    onChange={e => setSelectedZoneId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm"
                  >
                    <option value="">Zone (optioneel)</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                )}

                <input
                  type="text"
                  placeholder="Korte beschrijving (optioneel)"
                  value={incidentDesc}
                  onChange={e => setIncidentDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm"
                />

                <Button
                  onClick={handleReportIncident}
                  disabled={reporting}
                  className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-bold text-base"
                >
                  {reporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verstuur melding'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // CONTROL ROOM (desktop, dark mode forced)
  // ━━━━━━━━━━━━━━━━━━━━━━
  return (
    <ClubPageLayout>
      <div className={`relative min-h-screen transition-colors ${flashRed ? 'animate-pulse' : ''}`}>
        {/* Flash overlay */}
        <AnimatePresence>
          {flashRed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-red-600 z-50 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Control Room
            </h1>
            <p className="text-muted-foreground mt-1">{eventTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'}>
              {activeIncidents.length} actief{highPriorityCount > 0 && ` · ${highPriorityCount} hoog`}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setAudioEnabled(!audioEnabled)}>
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zone Monitor */}
          <div ref={zoneRef} className={`${incidentFullscreen ? 'hidden' : zoneFullscreen ? 'lg:col-span-3' : 'lg:col-span-2'} ${zoneFullscreen ? 'bg-background' : ''}`}>
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" /> Sectie Monitor
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { const next = !zoneFullscreen; setZoneFullscreen(next); setIncidentFullscreen(false); toggleBrowserFullscreen(zoneRef, next); }}>
                  {zoneFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-3 ${zoneFullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {zones.map(zone => {
                    const zoneIncidents = activeIncidents.filter(i => i.zone_id === zone.id);
                    return (
                      <div
                        key={zone.id}
                        className="relative rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md"
                        style={{ borderColor: zone.color + '80', background: zone.color + '10' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-heading font-semibold text-foreground text-sm">{zone.name}</span>
                          <div className={`w-3 h-3 rounded-full ${statusColor(zone.status === 'critical' ? 'nieuw' : zone.status === 'warning' ? 'bezig' : 'opgelost')}`} />
                        </div>
                        {zoneIncidents.length > 0 && (
                          <Badge variant="destructive" className="text-[10px]">{zoneIncidents.length} incident{zoneIncidents.length > 1 ? 'en' : ''}</Badge>
                        )}
                        <div className="mt-2 flex gap-1">
                          {(['normal', 'warning', 'critical'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => handleUpdateZone(zone.id, s)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${zone.status === s ? 'ring-2 ring-primary' : 'opacity-50 hover:opacity-80'}`}
                              style={{ background: s === 'critical' ? '#ef444430' : s === 'warning' ? '#f59e0b30' : '#22c55e30', color: s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#22c55e' }}
                            >
                              {s === 'critical' ? 'Kritiek' : s === 'warning' ? 'Waarschuwing' : 'Normaal'}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {zones.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Geen zones geconfigureerd voor dit evenement.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Live Incident Sidebar */}
          <div ref={incidentRef} className={`${zoneFullscreen ? 'hidden' : incidentFullscreen ? 'lg:col-span-3' : 'lg:col-span-1'} ${incidentFullscreen ? 'bg-background' : ''}`}>
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" /> Live Incidents
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { const next = !incidentFullscreen; setIncidentFullscreen(next); setZoneFullscreen(false); toggleBrowserFullscreen(incidentRef, next); }}>
                  {incidentFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
                <AnimatePresence>
                  {incidents.map(inc => (
                    <motion.div
                      key={inc.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`rounded-xl border p-3 space-y-2 ${inc.status === 'opgelost' ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${statusColor(inc.status)}`} />
                          <span className="font-medium text-sm text-foreground">{getIncidentTypeName(inc.incident_type_id)}</span>
                        </div>
                        <Badge className={`text-[10px] ${priorityColor(inc.priority)}`}>{inc.priority}</Badge>
                      </div>
                      {inc.description && <p className="text-xs text-muted-foreground">{inc.description}</p>}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {getZoneName(inc.zone_id)}
                        <Clock className="w-3 h-3 ml-2" /> {new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {inc.status !== 'opgelost' && (
                        <div className="flex gap-1.5">
                          {inc.status === 'nieuw' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateIncident(inc.id, 'bezig')}>
                              In behandeling
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-500 border-emerald-500/30" onClick={() => handleUpdateIncident(inc.id, 'opgelost')}>
                            Opgelost
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {incidents.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-muted-foreground text-sm">Geen incidenten</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClubPageLayout>
  );
};

export default SafetyDashboard;
