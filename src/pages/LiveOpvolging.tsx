import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Clock,
  Siren, Users, MapPin, RefreshCw, Wifi, WifiOff,
  UserCheck, X, Zap, Activity,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignment {
  signup_id: string;
  task_id: string;
  task_title: string;
  task_location: string | null;
  start_time: string | null;
  end_time: string | null;
  spots_available: number;
  volunteer_id: string;
  volunteer_name: string;
  volunteer_avatar: string | null;
  attendance_status: 'scheduled' | 'checked_in' | 'late' | 'no_show';
  checked_in_at: string | null;
  predicted_sub_location: string | null;
}

interface TaskGroup {
  task_id: string;
  task_title: string;
  task_location: string | null;
  start_time: string | null;
  end_time: string | null;
  spots_available: number;
  volunteers: Assignment[];
}

interface SosResult {
  task_id: string;
  task_title: string;
  task_start_time: string | null;
  task_location: string | null;
  late_volunteer_id: string;
  buddy_ids: string[];
  reserve_ids: string[];
  member_ids: string[];
}

// ── Status dot ────────────────────────────────────────────────────────────────
const StatusDot = ({ status }: { status: Assignment['attendance_status'] }) => {
  if (status === 'checked_in') return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
    </span>
  );
  if (status === 'late') return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
  );
  if (status === 'no_show') return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600" />
    </span>
  );
  return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400" />
    </span>
  );
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const VolAvatar = ({ name, url }: { name: string; url: string | null }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center text-xs font-semibold text-blue-300 shrink-0">
      {initials}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const LiveOpvolging = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  useClubContext(); // ensures auth context is loaded

  const nl = language === 'nl';
  const fr = language === 'fr';
  const t3 = (nlS: string, frS: string, enS: string) => nl ? nlS : fr ? frS : enS;

  const [eventTitle, setEventTitle] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(new Date());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  // SOS state
  const [sosTarget, setSosTarget] = useState<Assignment | null>(null);
  const [sosResult, setSosResult] = useState<SosResult | null>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const lateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!eventId) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    const { data, error } = await (supabase as any).rpc('get_event_live_status', { p_event_id: eventId });
    if (error) toast.error(error.message);
    else setAssignments((data as Assignment[]) || []);
    if (!silent) setLoading(false); else setRefreshing(false);
  }, [eventId]);

  // Load event title
  useEffect(() => {
    if (!eventId) return;
    supabase.from('events').select('title').eq('id', eventId).maybeSingle()
      .then(({ data }) => { if (data) setEventTitle(data.title); });
  }, [eventId]);

  // Initial load
  useEffect(() => { loadData(); }, [loadData]);

  // Clock tick
  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  // Refresh late statuses every 30 s
  useEffect(() => {
    if (!eventId) return;
    const tick = async () => {
      await (supabase as any).rpc('refresh_late_statuses', { p_event_id: eventId });
      await loadData(true);
    };
    lateRef.current = setInterval(tick, 30_000);
    return () => { if (lateRef.current) clearInterval(lateRef.current); };
  }, [eventId, loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!eventId) return;
    const ch = supabase.channel(`live-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_signups' },
        () => loadData(true))
      .subscribe(s => setConnected(s === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [eventId, loadData]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCheckIn = async (signupId: string) => {
    setCheckingIn(signupId);
    const { error } = await (supabase as any).rpc('mark_volunteer_checked_in', { p_signup_id: signupId });
    if (error) toast.error(error.message);
    else {
      setAssignments(prev => prev.map(a =>
        a.signup_id === signupId ? { ...a, attendance_status: 'checked_in', checked_in_at: new Date().toISOString() } : a
      ));
      toast.success(t3('Aanwezigheid bevestigd!', 'Présence confirmée!', 'Check-in confirmed!'));
    }
    setCheckingIn(null);
  };

  const handleNoShow = async (signupId: string) => {
    const { error } = await (supabase as any).rpc('mark_volunteer_no_show', { p_signup_id: signupId });
    if (error) toast.error(error.message);
    else setAssignments(prev => prev.map(a =>
      a.signup_id === signupId ? { ...a, attendance_status: 'no_show' } : a
    ));
  };

  const handleSosConfirm = async () => {
    if (!sosTarget) return;
    setSosLoading(true);
    const { data, error } = await (supabase as any).rpc('trigger_sos_replacement', { p_signup_id: sosTarget.signup_id });
    if (error) { toast.error(error.message); setSosLoading(false); return; }

    const result = data as SosResult;
    setSosResult(result);
    setAssignments(prev => prev.map(a =>
      a.signup_id === sosTarget.signup_id ? { ...a, attendance_status: 'no_show' } : a
    ));

    const taskUrl = `/task/${result.task_id}`;
    const msg = t3(
      `🚨 DRINGEND: Vrijwilliger nodig voor "${result.task_title}"! Reageer nu!`,
      `🚨 URGENT: Bénévole nécessaire pour "${result.task_title}"! Répondez maintenant!`,
      `🚨 URGENT: Volunteer needed for "${result.task_title}"! Respond now!`
    );

    for (const uid of (result.buddy_ids || [])) {
      await supabase.functions.invoke('send-native-push', {
        body: { type: 'sos_replacement', user_id: uid, title: '🤝 SOS Buddy Oproep', message: msg, url: taskUrl, club_id: clubId }
      });
    }
    for (const uid of (result.reserve_ids || [])) {
      await supabase.functions.invoke('send-native-push', {
        body: { type: 'sos_replacement', user_id: uid, title: '📋 Reserve Oproep', message: msg, url: taskUrl, club_id: clubId }
      });
    }
    for (const uid of (result.member_ids || [])) {
      await supabase.functions.invoke('send-native-push', {
        body: { type: 'sos_replacement', user_id: uid, title: '🚨 SOS: Vrijwilliger Nodig', message: msg, url: taskUrl, club_id: clubId }
      });
    }

    const total = (result.buddy_ids?.length || 0) + (result.reserve_ids?.length || 0) + (result.member_ids?.length || 0);
    toast.success(t3(`SOS verstuurd naar ${total} vrijwilligers!`, `SOS envoyé à ${total} bénévoles!`, `SOS sent to ${total} volunteers!`));
    setSosSent(true);
    setSosLoading(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const taskGroups = useMemo<TaskGroup[]>(() => {
    const map = new Map<string, TaskGroup>();
    for (const a of assignments) {
      if (!map.has(a.task_id)) {
        map.set(a.task_id, {
          task_id: a.task_id, task_title: a.task_title, task_location: a.task_location,
          start_time: a.start_time, end_time: a.end_time, spots_available: a.spots_available,
          volunteers: [],
        });
      }
      map.get(a.task_id)!.volunteers.push(a);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  }, [assignments]);

  const stats = useMemo(() => ({
    total:     assignments.length,
    checkedIn: assignments.filter(a => a.attendance_status === 'checked_in').length,
    late:      assignments.filter(a => a.attendance_status === 'late').length,
    scheduled: assignments.filter(a => a.attendance_status === 'scheduled').length,
  }), [assignments]);

  const fmt = (iso: string | null) => iso
    ? new Date(iso).toLocaleTimeString(nl ? 'nl-BE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const statusLabel = (s: Assignment['attendance_status']) => ({
    scheduled:  t3('Verwacht',  'Prévu',     'Scheduled'),
    checked_in: t3('Aanwezig',  'Présent',   'Checked in'),
    late:       t3('Te laat',   'En retard', 'Late'),
    no_show:    t3('Afwezig',   'Absent',    'No show'),
  })[s];

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(`/events/${eventId}`)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white text-base leading-none truncate">{eventTitle}</h1>
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5 font-mono">
                {now.toLocaleTimeString(nl ? 'nl-BE' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={cn("flex items-center gap-1.5 text-xs", connected ? "text-emerald-400" : "text-gray-500")}>
              {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{connected ? 'Live' : 'Offline'}</span>
            </div>
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs disabled:opacity-50">
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">{t3('Vernieuwen', 'Actualiser', 'Refresh')}</span>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-7xl mx-auto px-4 pb-3 grid grid-cols-4 gap-2">
          {[
            { value: stats.checkedIn, label: t3('Aanwezig', 'Présent',   'Present'),   color: 'text-emerald-400' },
            { value: stats.late,      label: t3('Te laat',  'En retard', 'Late'),      color: 'text-red-400' },
            { value: stats.scheduled, label: t3('Verwacht', 'Prévu',     'Scheduled'), color: 'text-gray-400' },
            { value: stats.total,     label: t3('Totaal',   'Total',     'Total'),     color: 'text-white/60' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2.5 text-center">
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className={cn("text-[10px] font-semibold uppercase tracking-wider mt-0.5", s.color)}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Task groups ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {taskGroups.length === 0 ? (
          <div className="text-center py-24 text-white/30">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base">{t3('Geen inschrijvingen gevonden.', 'Aucune inscription.', 'No assignments found.')}</p>
          </div>
        ) : taskGroups.map((group, gi) => {
          const checked    = group.volunteers.filter(v => v.attendance_status === 'checked_in').length;
          const lateCount  = group.volunteers.filter(v => v.attendance_status === 'late').length;
          const active     = group.volunteers.filter(v => v.attendance_status !== 'no_show').length;
          const allPresent = active > 0 && checked === active;

          return (
            <motion.div key={group.task_id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }}
              className={cn(
                "rounded-2xl border overflow-hidden",
                lateCount > 0   ? "border-red-500/30 bg-red-950/10"
                : allPresent    ? "border-emerald-500/20 bg-emerald-950/10"
                : "border-white/10 bg-white/5"
              )}>

              {/* Task header */}
              <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("shrink-0 w-1 h-10 rounded-full",
                    lateCount > 0 ? "bg-red-500" : allPresent ? "bg-emerald-500" : "bg-white/20")} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">{group.task_title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                      {group.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{fmt(group.start_time)}
                          {group.end_time && ` → ${fmt(group.end_time)}`}
                        </span>
                      )}
                      {group.task_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{group.task_location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/40">{checked}/{group.volunteers.length}</span>
                  {lateCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">
                      <AlertTriangle className="w-3 h-3" />{lateCount} {t3('te laat', 'en retard', 'late')}
                    </span>
                  )}
                  {allPresent && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" />{t3('Volledig', 'Complet', 'Complete')}
                    </span>
                  )}
                </div>
              </div>

              {/* Volunteer rows */}
              <div className="divide-y divide-white/5">
                {group.volunteers.map(vol => (
                  <div key={vol.signup_id}
                    className={cn(
                      "px-5 py-3 flex items-center gap-3 transition-colors",
                      vol.attendance_status === 'checked_in' && "bg-emerald-500/5",
                      vol.attendance_status === 'late'       && "bg-red-500/8",
                      vol.attendance_status === 'no_show'    && "opacity-40"
                    )}>
                    <StatusDot status={vol.attendance_status} />
                    <VolAvatar name={vol.volunteer_name} url={vol.volunteer_avatar} />

                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium text-sm truncate",
                        vol.attendance_status === 'checked_in' ? "text-white" :
                        vol.attendance_status === 'late'       ? "text-red-300" :
                        vol.attendance_status === 'no_show'    ? "text-white/40 line-through" :
                        "text-white/80")}>
                        {vol.volunteer_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className={cn(
                          vol.attendance_status === 'checked_in' ? "text-emerald-400" :
                          vol.attendance_status === 'late'       ? "text-red-400" :
                          "text-white/35")}>
                          {statusLabel(vol.attendance_status)}
                        </span>
                        {vol.checked_in_at && (
                          <span className="text-white/25">· {fmt(vol.checked_in_at)}</span>
                        )}
                        {vol.predicted_sub_location && (
                          <span className="text-white/25 flex items-center gap-0.5">
                            · <MapPin className="w-2.5 h-2.5" />{vol.predicted_sub_location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {vol.attendance_status === 'late' && (
                        <button onClick={() => { setSosTarget(vol); setSosResult(null); setSosSent(false); }}
                          className="flex items-center gap-1.5 px-3 py-2 h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                          <Siren className="w-3.5 h-3.5" />
                          {t3('SOS Vervanger', 'SOS Remplaçant', 'SOS Replace')}
                        </button>
                      )}
                      {(vol.attendance_status === 'scheduled' || vol.attendance_status === 'late') && (
                        <button onClick={() => handleCheckIn(vol.signup_id)} disabled={checkingIn === vol.signup_id}
                          className="flex items-center gap-1.5 px-3 py-2 h-9 rounded-lg border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium transition-colors disabled:opacity-50">
                          {checkingIn === vol.signup_id
                            ? <div className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            : <UserCheck className="w-3.5 h-3.5" />}
                          {t3('Check-in', 'Pointer', 'Check in')}
                        </button>
                      )}
                      {vol.attendance_status === 'scheduled' && (
                        <button onClick={() => handleNoShow(vol.signup_id)}
                          className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
                          title={t3('Markeer als afwezig', 'Marquer absent', 'Mark absent')}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── SOS Dialog ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sosTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget && !sosLoading) setSosTarget(null); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">

              {!sosSent ? (
                <>
                  <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <Siren className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-lg leading-none">SOS Vervanger Oproepen</h2>
                      <p className="text-red-400 text-sm mt-1">{sosTarget.volunteer_name} · {sosTarget.task_title}</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    <p className="text-white/60 text-sm">
                      {t3('Stuurt onmiddellijk push notificaties in volgorde van prioriteit:',
                          'Envoie immédiatement des notifications par ordre de priorité :',
                          'Immediately sends push notifications in priority order:')}
                    </p>
                    <div className="space-y-2">
                      {[
                        { icon: '🤝', step: t3("Stap 1", "Étape 1", "Step 1"), desc: t3("Buddy's van de vrijwilliger", "Amis du bénévole", "Volunteer's buddies"), color: "text-blue-400" },
                        { icon: '📋', step: t3("Stap 2", "Étape 2", "Step 2"), desc: t3("Reservelijst voor dit evenement", "Liste de réserve", "Reserve list for this event"), color: "text-amber-400" },
                        { icon: '👥', step: t3("Stap 3", "Étape 3", "Step 3"), desc: t3("Alle clubleden (breed net)", "Tous les membres", "All club members (wide net)"), color: "text-white/50" },
                      ].map(s => (
                        <div key={s.step} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                          <span className="text-xl">{s.icon}</span>
                          <div>
                            <p className={cn("text-xs font-semibold", s.color)}>{s.step}</p>
                            <p className="text-white/50 text-xs">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <p className="text-amber-400 text-xs">
                        {t3('⚠️ De vrijwilliger wordt gemarkeerd als "afwezig" en de taak wordt opengesteld voor vervanging.',
                            '⚠️ Le bénévole sera marqué "absent" et la tâche ouverte au remplacement.',
                            '⚠️ The volunteer will be marked "no show" and the task opened for replacement.')}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex gap-3">
                    <button onClick={() => setSosTarget(null)} disabled={sosLoading}
                      className="flex-1 h-12 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors text-sm font-medium disabled:opacity-50">
                      {t3('Annuleren', 'Annuler', 'Cancel')}
                    </button>
                    <button onClick={handleSosConfirm} disabled={sosLoading}
                      className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {sosLoading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Zap className="w-4 h-4" />{t3('Bevestig SOS!', 'Confirmer SOS!', 'Confirm SOS!')}</>}
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-6 py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3">{t3('SOS Verstuurd!', 'SOS Envoyé!', 'SOS Sent!')}</h3>
                  <div className="space-y-1 mb-6 text-sm text-white/50">
                    <p>{sosResult?.buddy_ids?.length || 0} {t3("buddy's", "amis", "buddies")}</p>
                    <p>{sosResult?.reserve_ids?.length || 0} {t3("reserves", "réservistes", "reserves")}</p>
                    <p>{sosResult?.member_ids?.length || 0} {t3("clubleden", "membres", "members")}</p>
                  </div>
                  <button onClick={() => setSosTarget(null)}
                    className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors">
                    {t3('Sluiten', 'Fermer', 'Close')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveOpvolging;
