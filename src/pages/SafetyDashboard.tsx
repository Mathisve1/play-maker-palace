import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Radio, Maximize2, Minimize2,
  Phone, ChevronRight, Clock, MapPin, Volume2, VolumeX, RefreshCw,
  Rocket, Lock, Camera, Image, RotateCcw, Trash2, Play, ToggleLeft, ToggleRight,
  XCircle, Heart, PartyPopper,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ClubPageLayout from '@/components/ClubPageLayout';
import VolunteerPhoneMockup from '@/components/safety/VolunteerPhoneMockup';
import IncidentMap from '@/components/safety/IncidentMap';

// Types
interface SafetyZone {
  id: string; name: string; status: string; color: string; event_id: string; club_id: string; checklist_active: boolean;
}
interface SafetyIncidentType {
  id: string; label: string; icon: string; color: string; default_priority: string; club_id: string;
}
interface SafetyIncident {
  id: string; event_id: string; club_id: string; incident_type_id: string | null;
  zone_id: string | null; reporter_id: string; description: string | null;
  lat: number | null; lng: number | null; status: string; priority: string;
  created_at: string; updated_at: string; resolved_by: string | null; resolved_at: string | null;
  photo_url: string | null;
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
  const [userGroupIds, setUserGroupIds] = useState<Set<string>>(new Set());
  const [isStaff, setIsStaff] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isDemoEvent, setIsDemoEvent] = useState(false);

  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<SafetyIncidentType[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [eventClosed, setEventClosed] = useState(false);
  const [closingEvent, setClosingEvent] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [zoneFullscreen, setZoneFullscreen] = useState(false);
  const [incidentFullscreen, setIncidentFullscreen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const incidentRef = useRef<HTMLDivElement>(null);

  // Steward state - two-step reporting
  const [showIncidentGrid, setShowIncidentGrid] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<SafetyIncidentType | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [reporting, setReporting] = useState(false);
  const [incidentPhoto, setIncidentPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingIncidentId, setPendingIncidentId] = useState<string | null>(null);
  const [step2Mode, setStep2Mode] = useState(false);

  const flashTimeout = useRef<NodeJS.Timeout>();

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

  // ── Load data ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !eventId) { navigate('/login'); return; }
      setUserId(session.user.id);

      const { data: ev } = await (supabase as any).from('events').select('id, club_id, title, is_live, status').eq('id', eventId).maybeSingle();
      if (!ev) { navigate('/events-manager'); return; }
      setClubId(ev.club_id);
      setEventTitle(ev.title);
      setIsLive(ev.is_live ?? false);
      if (ev.status === 'closed') setEventClosed(true);
      setIsDemoEvent(ev.title?.includes('SIMULATIE') || ev.title?.includes('Harelbeke') || ev.title?.includes('Demo') || false);

      const { data: owned } = await supabase.from('clubs').select('id').eq('id', ev.club_id).eq('owner_id', session.user.id);
      const { data: member } = await (supabase as any).from('club_members').select('role').eq('club_id', ev.club_id).eq('user_id', session.user.id).maybeSingle();
      const staff = !!(owned?.length) || ['bestuurder', 'beheerder'].includes(member?.role || '');
      setIsStaff(staff);

      // Fetch user's assigned group IDs for this event
      const { data: userSignups } = await supabase
        .from('task_signups')
        .select('task_id')
        .eq('volunteer_id', session.user.id);
      
      if (userSignups?.length) {
        const uTaskIds = userSignups.map(s => s.task_id);
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('event_group_id')
          .in('id', uTaskIds)
          .eq('event_id', eventId);
        setUserGroupIds(new Set((userTasks || []).map(t => t.event_group_id).filter(Boolean) as string[]));
      }

      const [zRes, itRes, incRes, clRes, cpRes] = await Promise.all([
        (supabase as any).from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_incident_types').select('*').eq('club_id', ev.club_id).order('sort_order'),
        (supabase as any).from('safety_incidents').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        (supabase as any).from('safety_checklist_items').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_checklist_progress').select('*'),
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload: any) => {
          if (payload.new.is_live !== undefined) {
            setIsLive(payload.new.is_live);
          }
          if (payload.new.status === 'closed') {
            setEventClosed(true);
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        () => {
          // Event was deleted (e.g. simulation restart) — navigate volunteer away
          toast.info('Event is beëindigd of herstart.');
          navigate('/volunteer');
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

  // ── Photo handling ──
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIncidentPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!incidentPhoto || !userId) return null;
    const ext = incidentPhoto.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('incident-photos').upload(path, incidentPhoto);
    if (error) { console.error('Photo upload failed:', error); return null; }
    const { data: { publicUrl } } = supabase.storage.from('incident-photos').getPublicUrl(path);
    return publicUrl;
  };

  // ── Steward: Step 1 — instant report (type + GPS) ──
  const handleInstantReport = async (type: SafetyIncidentType) => {
    if (!eventId || !clubId || !userId) return;
    setSelectedIncidentType(type);
    setReporting(true);

    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch {
      toast.error('GPS-locatie is vereist om een incident te melden. Sta locatietoegang toe.');
      setReporting(false);
      return;
    }

    const { data: inc, error } = await (supabase as any).from('safety_incidents').insert({
      event_id: eventId, club_id: clubId, incident_type_id: type.id,
      reporter_id: userId, priority: type.default_priority, status: 'nieuw',
      lat, lng,
    }).select('id').single();

    if (error) { toast.error(error.message); setReporting(false); return; }

    setPendingIncidentId(inc.id);
    setStep2Mode(true);
    setShowIncidentGrid(false);
    toast.success('⚡ Melding direct verstuurd met GPS!');
    setReporting(false);
  };

  // ── Steward: Step 2 — update with details ──
  const handleUpdateReport = async () => {
    if (!pendingIncidentId) return;
    setReporting(true);

    const photo_url = await uploadPhoto();
    const updates: any = {};
    if (incidentDesc.trim()) updates.description = incidentDesc.trim();
    if (selectedZoneId) updates.zone_id = selectedZoneId;
    if (photo_url) updates.photo_url = photo_url;

    if (Object.keys(updates).length > 0) {
      await (supabase as any).from('safety_incidents').update(updates).eq('id', pendingIncidentId);
    }

    toast.success('Details toegevoegd aan melding');
    resetReportFlow();
    setReporting(false);
  };

  const resetReportFlow = () => {
    setShowIncidentGrid(false);
    setSelectedIncidentType(null);
    setSelectedZoneId('');
    setIncidentDesc('');
    setIncidentPhoto(null);
    setPhotoPreview(null);
    setPendingIncidentId(null);
    setStep2Mode(false);
  };

  // ── Control room: update incident ──
  const handleUpdateIncident = async (incidentId: string, status: string) => {
    await (supabase as any).from('safety_incidents').update({
      status, updated_at: new Date().toISOString(),
      ...(status === 'opgelost' ? { resolved_by: userId, resolved_at: new Date().toISOString() } : {}),
    }).eq('id', incidentId);
  };

  // ── GO LIVE ──
  const handleGoLive = async () => {
    if (!eventId) return;
    await (supabase as any).from('events').update({ is_live: true }).eq('id', eventId);
    setIsLive(true);
    toast.success('🚀 Event is LIVE! Vrijwilligers kunnen nu incidenten melden.');
  };

  // ── CLOSE EVENT ──
  const handleCloseEvent = async () => {
    if (!eventId) return;
    setClosingEvent(true);
    const { error } = await (supabase as any).from('events').update({ is_live: false, status: 'closed' }).eq('id', eventId);
    if (error) {
      toast.error(error.message);
    } else {
      setIsLive(false);
      setEventClosed(true);
      toast.success('Event is afgesloten. Alle vrijwilligers worden doorgestuurd.');
    }
    setClosingEvent(false);
    setShowCloseConfirm(false);
  };

  // ── Toggle zone checklist activation ──
  const handleToggleZoneActive = async (zoneId: string, currentValue: boolean) => {
    const newValue = !currentValue;
    // Optimistic update
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, checklist_active: newValue } : z));
    const { error } = await (supabase as any).from('safety_zones').update({ checklist_active: newValue }).eq('id', zoneId);
    if (error) {
      toast.error(error.message);
      setZones(prev => prev.map(z => z.id === zoneId ? { ...z, checklist_active: currentValue } : z));
    } else {
      toast.success(newValue ? `✅ Zone "${zones.find(z => z.id === zoneId)?.name}" geactiveerd` : `Zone "${zones.find(z => z.id === zoneId)?.name}" gedeactiveerd`);
    }
  };

  // ── Simulation controls ──
  // (simLoading state is declared at top level)

  const handleResetSimulation = async () => {
    if (!clubId) return;
    setSimLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke('simulate-event', {
        body: { club_id: clubId, action: 'delete' },
      });
      if (res.error) throw res.error;
      toast.success('Simulatie data verwijderd!');
      // Navigate back to events
      navigate('/events-manager');
    } catch (err: any) {
      toast.error(err.message || 'Fout bij verwijderen');
    } finally {
      setSimLoading(false);
    }
  };

  const handleRestartSimulation = async () => {
    if (!clubId) return;
    setSimLoading(true);
    try {
      // First delete
      await supabase.functions.invoke('simulate-event', {
        body: { club_id: clubId, action: 'delete' },
      });
      // Then create new
      const res = await supabase.functions.invoke('simulate-event', {
        body: { club_id: clubId },
      });
      if (res.error) throw res.error;
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (data.event_id) {
        toast.success('Simulatie herstart! Navigeren naar nieuw event...');
        navigate(`/safety/${data.event_id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Fout bij herstarten');
    } finally {
      setSimLoading(false);
    }
  };

  // ── Computed values ──
  // Filter zones/items for volunteer view based on assigned groups
  const myZones = useMemo(() => {
    if (isStaff) return zones;
    // Volunteers only see zones linked to their assigned groups (or unlinked zones)
    return zones.filter((z: any) => !z.event_group_id || userGroupIds.has(z.event_group_id));
  }, [zones, userGroupIds, isStaff]);
  
  const myZoneIds = useMemo(() => new Set(myZones.map(z => z.id)), [myZones]);
  
  const myChecklistItems = useMemo(() => {
    if (isStaff) return checklistItems;
    // Volunteers only see items in their assigned zones (never zone-less items for safety)
    if (userGroupIds.size === 0) return [];
    return checklistItems.filter(i => i.zone_id && myZoneIds.has(i.zone_id));
  }, [checklistItems, myZoneIds, isStaff, userGroupIds]);

  const isItemCompleted = (itemId: string) => checklistProgress.some(p => p.checklist_item_id === itemId && p.is_completed);
  const activeIncidents = useMemo(() => incidents.filter(i => i.status !== 'opgelost'), [incidents]);
  const highPriorityCount = activeIncidents.filter(i => i.priority === 'high').length;

  const getIncidentTypeName = (typeId: string | null) => incidentTypes.find(t => t.id === typeId)?.label || 'Onbekend';
  const getZoneName = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.name || '—';

  const priorityColor = (p: string) => p === 'high' ? 'bg-destructive/20 text-destructive border-destructive/30' : p === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  const statusColor = (s: string) => s === 'nieuw' ? 'bg-destructive' : s === 'bezig' ? 'bg-amber-500' : 'bg-emerald-500';

  // Zone checklist progress
  const zoneProgress = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    zones.forEach(z => { map[z.id] = { total: 0, done: 0 }; });
    map['__general'] = { total: 0, done: 0 };
    checklistItems.forEach(item => {
      const key = item.zone_id || '__general';
      if (!map[key]) map[key] = { total: 0, done: 0 };
      map[key].total++;
      if (isItemCompleted(item.id)) map[key].done++;
    });
    return map;
  }, [zones, checklistItems, checklistProgress]);

  // For staff: use all items. For volunteers: use filtered items.
  const volChecklistDone = myChecklistItems.filter(i => isItemCompleted(i.id)).length;
  const volChecklistTotal = myChecklistItems.length;
  // Staff always sees all items for GO LIVE decision
  const totalChecklistDone = checklistItems.filter(i => isItemCompleted(i.id)).length;
  const totalChecklistItems = checklistItems.length;
  const allChecklistComplete = totalChecklistItems > 0 && totalChecklistDone === totalChecklistItems;

  const zoneHasActiveIncident = useCallback((zoneId: string) => {
    return activeIncidents.some(i => i.zone_id === zoneId);
  }, [activeIncidents]);

  // Auto-redirect volunteers after event closes (5s delay)
  useEffect(() => {
    if (!isStaff && eventClosed) {
      const timer = setTimeout(() => navigate('/volunteer'), 5000);
      return () => clearTimeout(timer);
    }
  }, [isStaff, eventClosed, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // VOLUNTEER: Thank-you screen after event closes
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff && eventClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <PartyPopper className="w-16 h-16 mx-auto text-primary mb-2" />
          </motion.div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Bedankt!</h1>
          <p className="text-muted-foreground text-lg">
            Het evenement <span className="font-semibold text-foreground">{eventTitle}</span> is afgelopen.
          </p>
          <p className="text-muted-foreground text-sm">
            Bedankt voor je inzet als vrijwilliger! Je wordt zo doorgestuurd naar je dashboard.
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => navigate('/volunteer')}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              <Heart className="w-5 h-5" /> Terug naar dashboard
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // VOLUNTEER VIEW - After GO LIVE: Incident-only mode
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff && isLive) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            <span className="font-heading font-bold text-foreground truncate">{eventTitle}</span>
          </div>
          <Badge variant="destructive" className="text-xs gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> LIVE
          </Badge>
        </header>

        <div className="p-4 pb-32 space-y-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
            <Lock className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Event is live — Meld incidenten hieronder</p>
            <p className="text-xs text-muted-foreground mt-1">Andere functies zijn vergrendeld tijdens het evenement.</p>
          </div>
        </div>

        {/* Floating incident button — TWO-STEP */}
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <AnimatePresence mode="wait">
            {!showIncidentGrid && !step2Mode && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                <Button
                  onClick={() => setShowIncidentGrid(true)}
                  className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground shadow-lg text-base font-bold gap-2"
                >
                  <AlertTriangle className="w-5 h-5" /> Incident melden
                </Button>
              </motion.div>
            )}

            {showIncidentGrid && !step2Mode && (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bg-card rounded-2xl border border-border shadow-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-foreground">Tik = direct melden!</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowIncidentGrid(false)}><Minimize2 className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {incidentTypes.map(type => (
                    <button
                      key={type.id}
                      disabled={reporting}
                      onClick={() => handleInstantReport(type)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-destructive/50 bg-background transition-all active:scale-95 min-h-[80px]"
                    >
                      <AlertTriangle className="w-6 h-6" style={{ color: type.color }} />
                      <span className="text-xs font-medium text-foreground text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">GPS wordt automatisch meegestuurd bij klik</p>
              </motion.div>
            )}

            {step2Mode && selectedIncidentType && (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bg-card rounded-2xl border border-border shadow-2xl p-4 space-y-3"
              >
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 text-center">
                  <p className="text-xs font-semibold text-emerald-600">✓ Melding verstuurd met GPS!</p>
                  <p className="text-[10px] text-muted-foreground">Voeg hieronder extra details toe</p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" style={{ color: selectedIncidentType.color }} />
                  <span className="font-heading font-bold text-foreground">{selectedIncidentType.label}</span>
                </div>
                {zones.length > 0 && (
                  <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm">
                    <option value="">Zone (optioneel)</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                )}
                <input type="text" placeholder="Korte beschrijving (optioneel)" value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm" />

                {/* Photo upload */}
                <div>
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-border" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6" onClick={() => { setIncidentPhoto(null); setPhotoPreview(null); }}>×</Button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Foto toevoegen (optioneel)</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetReportFlow} className="flex-1 h-12 rounded-xl text-sm">
                    Overslaan
                  </Button>
                  <Button onClick={handleUpdateReport} disabled={reporting} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                    {reporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Details toevoegen'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // VOLUNTEER VIEW - Before GO LIVE: Checklist mode
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-foreground truncate">{eventTitle}</span>
          </div>
          <Badge variant="outline" className="text-xs">{volChecklistDone}/{volChecklistTotal}</Badge>
        </header>

        <div className="p-4 pb-32 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Voortgang</span>
              <span className="font-semibold text-foreground">{volChecklistTotal > 0 ? Math.round((volChecklistDone / volChecklistTotal) * 100) : 0}%</span>
            </div>
            <Progress value={volChecklistTotal > 0 ? (volChecklistDone / volChecklistTotal) * 100 : 0} className="h-3" />
          </div>

          {/* Items grouped by zone — only user's assigned zones */}
          {myZones.map(zone => {
            const items = myChecklistItems.filter(ci => ci.zone_id === zone.id);
            if (items.length === 0) return null;
            const prog = zoneProgress[zone.id];
            const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
            const isActive = (zone as any).checklist_active;
            return (
              <div key={zone.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                    {zone.name}
                  </h3>
                  {isActive ? (
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                      <Lock className="w-3 h-3" /> Wacht op activatie
                    </Badge>
                  )}
                </div>
                {isActive ? (
                  <div className="space-y-1.5">
                    {items.map(item => {
                      const done = isItemCompleted(item.id);
                      return (
                        <motion.button
                          key={item.id}
                          layout
                          onClick={() => handleToggleChecklist(item.id)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${done ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-card border-border hover:border-primary/30'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}>
                            {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.description}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5 opacity-50 pointer-events-none">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/30"
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                        <span className="text-sm text-muted-foreground">{item.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {myChecklistItems.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-6">Geen checklist items voor jouw toegewezen zones.</p>
          )}
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // CONTROL ROOM (Staff view)
  // ━━━━━━━━━━━━━━━━━━━━━━
  return (
    <ClubPageLayout>
      <div className={`relative min-h-screen transition-colors ${flashRed ? 'animate-pulse' : ''}`}>
        {/* Flash overlay */}
        <AnimatePresence>
          {flashRed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-destructive z-50 pointer-events-none"
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
            {isLive && (
              <Badge variant="destructive" className="gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE
              </Badge>
            )}
            {!isLive && (
              <Badge variant="secondary">Pre-event</Badge>
            )}
            {isLive && (
              <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'}>
                {activeIncidents.length} actief{highPriorityCount > 0 && ` · ${highPriorityCount} hoog`}
              </Badge>
            )}
            {isLive && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowCloseConfirm(true)}
              >
                <XCircle className="w-3.5 h-3.5" /> Sluit Event
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setAudioEnabled(!audioEnabled)}>
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {isDemoEvent && (
              <>
                <Button variant="outline" size="sm" onClick={handleRestartSimulation} disabled={simLoading} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Herstart
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResetSimulation} disabled={simLoading} className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Verwijder
                </Button>
              </>
            )}
          </div>
        </div>

        {/* PRE-EVENT: Checklist progress + GO LIVE */}
        {!isLive && (
          <div className="mb-6 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Pre-event Checklist Voortgang
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Totaal</span>
                    <span className="font-semibold text-foreground">{totalChecklistDone}/{totalChecklistItems} ({totalChecklistItems > 0 ? Math.round((totalChecklistDone / totalChecklistItems) * 100) : 0}%)</span>
                  </div>
                  <Progress value={totalChecklistItems > 0 ? (totalChecklistDone / totalChecklistItems) * 100 : 0} className="h-3" />
                </div>

                {/* Per-zone with items always visible */}
                <div className="space-y-4">
                  {zones.map(zone => {
                    const prog = zoneProgress[zone.id];
                    if (!prog || prog.total === 0) return null;
                    const pct = Math.round((prog.done / prog.total) * 100);
                    const zoneItems = checklistItems.filter(ci => ci.zone_id === zone.id);
                    return (
                      <div key={zone.id} className={`rounded-xl border-2 p-4 transition-all ${pct === 100 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                            {zone.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">{prog.done}/{prog.total} — {pct}%</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 gap-1 text-xs ${(zone as any).checklist_active ? 'text-emerald-500' : 'text-muted-foreground'}`}
                              onClick={() => handleToggleZoneActive(zone.id, (zone as any).checklist_active)}
                            >
                              {(zone as any).checklist_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              {(zone as any).checklist_active ? 'Actief' : 'Uit'}
                            </Button>
                          </div>
                        </div>
                        <Progress value={pct} className="h-2 mb-3" />
                        {/* Individual items — club can also check them */}
                        <div className="space-y-1">
                          {zoneItems.map(ci => (
                            <button
                              key={ci.id}
                              onClick={() => handleToggleChecklist(ci.id)}
                              className="flex items-center gap-2 text-xs py-1 w-full text-left hover:bg-muted/50 rounded px-1 transition-colors"
                            >
                              {isItemCompleted(ci.id)
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                              }
                              <span className={isItemCompleted(ci.id) ? 'text-muted-foreground line-through' : 'text-foreground'}>{ci.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GO LIVE */}
                {allChecklistComplete ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Button onClick={handleGoLive} className="w-full h-14 text-lg font-bold gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg">
                      <Rocket className="w-6 h-6" /> GO LIVE
                    </Button>
                  </motion.div>
                ) : (
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Alle checklist items moeten afgevinkt zijn voordat je live kunt gaan.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main content: Control Room + optional Phone Mockup */}
        <div className={`grid gap-6 ${isDemoEvent ? 'grid-cols-1 xl:grid-cols-[1fr_1fr_320px]' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Zone Monitor */}
          <div ref={zoneRef} className={`${incidentFullscreen ? 'hidden' : zoneFullscreen ? 'col-span-full' : isDemoEvent ? 'xl:col-span-1' : 'lg:col-span-2'} ${zoneFullscreen ? 'bg-background h-screen flex flex-col' : ''}`}>
            <Card className={`bg-card border-border ${zoneFullscreen ? 'flex-1 flex flex-col border-0 rounded-none' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" /> Sectie Monitor
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { const next = !zoneFullscreen; setZoneFullscreen(next); setIncidentFullscreen(false); toggleBrowserFullscreen(zoneRef, next); }}>
                  {zoneFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className={zoneFullscreen ? 'flex-1 overflow-auto' : ''}>
                <div className={`grid gap-3 ${zoneFullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr h-full' : 'grid-cols-2 md:grid-cols-3'}`} style={zoneFullscreen ? { minHeight: 'calc(100vh - 80px)' } : undefined}>
                  {zones.map(zone => {
                    const hasIncident = zoneHasActiveIncident(zone.id);
                    const zoneIncidents = activeIncidents.filter(i => i.zone_id === zone.id);
                    const prog = zoneProgress[zone.id];
                    const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : null;

                    return (
                      <motion.div
                        key={zone.id}
                        animate={{ backgroundColor: hasIncident ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)' }}
                        transition={{ duration: 0.5 }}
                        className={`relative rounded-xl border-2 p-4 transition-all flex flex-col ${hasIncident ? 'border-destructive shadow-lg shadow-destructive/10' : 'border-border bg-card'} ${zoneFullscreen ? 'min-h-0' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-heading font-semibold text-foreground ${zoneFullscreen ? 'text-base lg:text-lg' : 'text-sm'}`}>{zone.name}</span>
                          {hasIncident && (
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className={`rounded-full bg-destructive ${zoneFullscreen ? 'w-4 h-4' : 'w-3 h-3'}`}
                            />
                          )}
                          {!hasIncident && <div className={`rounded-full bg-emerald-500 ${zoneFullscreen ? 'w-4 h-4' : 'w-3 h-3'}`} />}
                        </div>
                        {zoneIncidents.length > 0 && (
                          <Badge variant="destructive" className={`mb-1 ${zoneFullscreen ? 'text-xs' : 'text-[10px]'}`}>{zoneIncidents.length} incident{zoneIncidents.length > 1 ? 'en' : ''}</Badge>
                        )}
                        {!isLive && pct !== null && (
                          <div className="mt-2">
                            <Progress value={pct} className={zoneFullscreen ? 'h-2.5' : 'h-1.5'} />
                            <p className={`text-muted-foreground mt-0.5 ${zoneFullscreen ? 'text-xs' : 'text-[10px]'}`}>{pct}% klaar</p>
                          </div>
                        )}

                        {/* Always show checklist details when not live */}
                        {!isLive && (
                          <div className={`mt-3 space-y-1 flex-1 ${zoneFullscreen ? 'space-y-2' : ''}`}>
                            {checklistItems.filter(ci => ci.zone_id === zone.id).map(ci => (
                              <div key={ci.id} className={`flex items-center gap-2 ${zoneFullscreen ? 'text-sm' : 'text-xs'}`}>
                                {isItemCompleted(ci.id)
                                  ? <CheckCircle2 className={`text-emerald-500 shrink-0 ${zoneFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                                  : <div className={`rounded-full border border-muted-foreground/40 shrink-0 ${zoneFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                                }
                                <span className={isItemCompleted(ci.id) ? 'text-muted-foreground line-through' : 'text-foreground'}>{ci.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                {zones.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Geen zones geconfigureerd voor dit evenement.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Live Incident Sidebar - only show ACTIVE incidents */}
          <div ref={incidentRef} className={`${zoneFullscreen ? 'hidden' : incidentFullscreen ? 'col-span-full' : 'lg:col-span-1'} ${incidentFullscreen ? 'bg-background h-screen flex flex-col' : ''}`}>
            <Card className={`bg-card border-border ${incidentFullscreen ? 'flex-1 flex flex-col border-0 rounded-none' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" /> Live Incidents
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { const next = !incidentFullscreen; setIncidentFullscreen(next); setZoneFullscreen(false); toggleBrowserFullscreen(incidentRef, next); }}>
                  {incidentFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className={`space-y-3 ${incidentFullscreen ? 'flex-1 flex flex-col overflow-hidden' : 'max-h-[70vh] overflow-y-auto'}`}>
                {/* Overview map with all active incidents */}
                {activeIncidents.some(i => i.lat && i.lng) && (
                  <div className={incidentFullscreen ? 'shrink-0' : ''}>
                    <IncidentMap incidents={activeIncidents} getTypeName={getIncidentTypeName} height={incidentFullscreen ? 'calc(50vh - 60px)' : '220px'} />
                  </div>
                )}
                <div className={incidentFullscreen ? 'flex-1 overflow-y-auto space-y-3' : ''}>
                  <AnimatePresence>
                    {activeIncidents.map(inc => {
                      const incidentType = incidentTypes.find(t => t.id === inc.incident_type_id);
                      return (
                        <motion.div
                          key={inc.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={`rounded-xl border space-y-2 ${incidentFullscreen ? 'p-4' : 'p-3'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${statusColor(inc.status)}`} />
                              <span className={`font-medium text-foreground ${incidentFullscreen ? 'text-base' : 'text-sm'}`}>{getIncidentTypeName(inc.incident_type_id)}</span>
                            </div>
                            {incidentType && (
                              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: incidentType.color }} title={incidentType.label} />
                            )}
                          </div>
                          {inc.description && <p className={`text-muted-foreground ${incidentFullscreen ? 'text-sm' : 'text-xs'}`}>{inc.description}</p>}

                          {/* Show photo if present */}
                          {inc.photo_url && (
                            <img src={inc.photo_url} alt="Incident foto" className={`w-full object-cover rounded-lg border border-border ${incidentFullscreen ? 'h-40' : 'h-24'}`} />
                          )}

                          <div className={`flex items-center gap-2 text-muted-foreground ${incidentFullscreen ? 'text-xs' : 'text-[10px]'}`}>
                            <MapPin className="w-3 h-3" /> {getZoneName(inc.zone_id)}
                            {inc.lat && inc.lng && (
                              <span className="text-[9px]">({inc.lat.toFixed(4)}, {inc.lng.toFixed(4)})</span>
                            )}
                            <Clock className="w-3 h-3 ml-2" /> {new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex gap-1.5">
                            {inc.status === 'nieuw' && (
                              <Button size="sm" variant="outline" className={`text-xs ${incidentFullscreen ? 'h-9' : 'h-7'}`} onClick={() => handleUpdateIncident(inc.id, 'bezig')}>
                                In behandeling
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className={`text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 ${incidentFullscreen ? 'h-9' : 'h-7'}`} onClick={() => handleUpdateIncident(inc.id, 'opgelost')}>
                              ✓ Opgelost
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {activeIncidents.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <p className="text-muted-foreground text-sm">{isLive ? 'Geen actieve incidenten' : 'Wacht op GO LIVE'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phone Mockup (demo only) */}
          {isDemoEvent && !zoneFullscreen && !incidentFullscreen && (
            <div className="hidden xl:block">
              <VolunteerPhoneMockup
                zones={zones}
                incidentTypes={incidentTypes}
                checklistItems={checklistItems}
                checklistProgress={checklistProgress}
                isLive={isLive}
                eventTitle={eventTitle}
                eventId={eventId || ''}
                clubId={clubId || ''}
              />
            </div>
          )}
        </div>

        {/* Close Event Confirmation Dialog */}
        <AnimatePresence>
          {showCloseConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
              onClick={() => setShowCloseConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h2 className="text-xl font-heading font-bold text-foreground">Event afsluiten?</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Dit zet GO LIVE uit voor alle vrijwilligers. Ze krijgen een bedankscherm te zien en worden teruggestuurd naar hun dashboard.
                  </p>
                  {activeIncidents.length > 0 && (
                    <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                      <p className="text-sm font-medium text-destructive">
                        ⚠️ Er zijn nog {activeIncidents.length} actieve incident{activeIncidents.length > 1 ? 'en' : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={() => setShowCloseConfirm(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-11 rounded-xl font-bold"
                    disabled={closingEvent}
                    onClick={handleCloseEvent}
                  >
                    {closingEvent ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Ja, sluit event'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ClubPageLayout>
  );
};

export default SafetyDashboard;
