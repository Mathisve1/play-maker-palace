import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Calendar, Clock, MapPin, Users,
  CheckCircle2, AlertCircle, Loader2, Send, Eye, RefreshCw,
  ChevronDown, ChevronUp, UserCheck, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Assignment {
  id: string;
  volunteer_id: string;
  status: string;
  is_draft: boolean;
  predicted_sub_location: string | null;
  full_name: string;
  avatar_url: string | null;
}

interface EventTask {
  id: string;
  title: string;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  spots_available: number;
  status: string | null;
  assignments: Assignment[];
}

interface EventData {
  id: string;
  title: string;
  event_date: string | null;
  kickoff_time: string | null;
  location: string | null;
  club_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    back: 'Evenementen',
    tasks: 'shifts', tasksPlural: 'shifts',
    filled: 'ingevuld',
    open: 'openstaand',
    draft: 'concept',
    autoFill: 'Automatisch Inroosteren',
    autoFillBeta: '(Beta)',
    autoFillDesc: 'Scores vrijwilligers op beschikbaarheid, historiek & buddies.',
    autoFilling: 'Analyseren en inroosteren...',
    publish: 'Publiceer & Stuur Notificaties',
    publishing: 'Publiceren...',
    publishDone: 'Gepubliceerd! Notificaties verstuurd.',
    assignedDraft: 'Concept',
    assignedConfirmed: 'Bevestigd',
    noTasks: 'Geen shifts voor dit evenement',
    noTasksDesc: 'Maak shifts aan via de Evenementen pagina of gebruik een sjabloon.',
    noAssignments: 'Niet ingevuld',
    spotsOf: 'van',
    assignResult: '{n} vrijwilligers ingeroosterd als concept.',
    assignError: 'Inroosteren mislukt. Probeer opnieuw.',
    publishError: 'Publiceren mislukt. Probeer opnieuw.',
    allFilled: 'Alle shifts volledig ingevuld',
    hasDrafts: 'concepttoewijzingen wachten op publicatie',
    kickoff: 'Aftrap',
  },
  fr: {
    back: 'Événements',
    tasks: 'shift', tasksPlural: 'shifts',
    filled: 'rempli',
    open: 'ouvert',
    draft: 'brouillon',
    autoFill: 'Attribution automatique',
    autoFillBeta: '(Bêta)',
    autoFillDesc: 'Score les bénévoles selon disponibilité, historique et binômes.',
    autoFilling: 'Analyse et attribution...',
    publish: 'Publier & Envoyer les notifications',
    publishing: 'Publication...',
    publishDone: 'Publié ! Notifications envoyées.',
    assignedDraft: 'Brouillon',
    assignedConfirmed: 'Confirmé',
    noTasks: 'Aucun shift pour cet événement',
    noTasksDesc: 'Créez des shifts via la page Événements ou utilisez un modèle.',
    noAssignments: 'Non attribué',
    spotsOf: 'sur',
    assignResult: '{n} bénévoles attribués en brouillon.',
    assignError: "Échec de l'attribution. Réessayez.",
    publishError: 'Échec de la publication. Réessayez.',
    allFilled: 'Tous les shifts sont remplis',
    hasDrafts: 'attributions en brouillon attendent publication',
    kickoff: 'Coup d\'envoi',
  },
  en: {
    back: 'Events',
    tasks: 'shift', tasksPlural: 'shifts',
    filled: 'filled',
    open: 'open',
    draft: 'draft',
    autoFill: 'Auto-Assign Volunteers',
    autoFillBeta: '(Beta)',
    autoFillDesc: 'Scores volunteers on availability, history & buddy matches.',
    autoFilling: 'Analysing and assigning...',
    publish: 'Publish & Send Notifications',
    publishing: 'Publishing...',
    publishDone: 'Published! Notifications sent.',
    assignedDraft: 'Draft',
    assignedConfirmed: 'Confirmed',
    noTasks: 'No shifts for this event',
    noTasksDesc: 'Create shifts via the Events page or use a template.',
    noAssignments: 'Unassigned',
    spotsOf: 'of',
    assignResult: '{n} volunteers assigned as draft.',
    assignError: 'Auto-assign failed. Try again.',
    publishError: 'Publish failed. Try again.',
    allFilled: 'All shifts fully staffed',
    hasDrafts: 'draft assignments awaiting publish',
    kickoff: 'Kick-off',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | null) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (s: string | null) => {
  if (!s) return '–';
  return new Date(s).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard sub-component
// ─────────────────────────────────────────────────────────────────────────────

const TaskCard = ({ task, l, defaultExpanded }: { task: EventTask; l: Record<string, string>; defaultExpanded: boolean }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const filledCount = task.assignments.filter(a => !a.is_draft).length;
  const draftCount  = task.assignments.filter(a => a.is_draft).length;
  const totalFilled = filledCount + draftCount;
  const pct = task.spots_available > 0 ? Math.round((totalFilled / task.spots_available) * 100) : 0;

  const fillColor =
    pct === 100 ? 'bg-emerald-500' :
    draftCount > 0 ? 'bg-amber-400' :
    'bg-blue-500';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Task header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        {/* Colour dot */}
        <div className={cn('w-2 h-2 rounded-full shrink-0', fillColor)} />

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {task.start_time && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="w-3 h-3" />
                {fmtTime(task.start_time)}{task.end_time ? ` – ${fmtTime(task.end_time)}` : ''}
              </span>
            )}
            {task.location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 truncate max-w-[140px]">
                <MapPin className="w-3 h-3 shrink-0" />
                {task.location}
              </span>
            )}
          </div>
        </div>

        {/* Spots pill */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full',
            pct === 100
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : draftCount > 0
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {totalFilled}/{task.spots_available}
          </span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          }
        </div>
      </button>

      {/* Fill bar */}
      <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
        <div
          className={cn('h-full transition-all duration-500', fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Volunteer rows */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 space-y-1">
              {task.assignments.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 italic">{l.noAssignments}</p>
              ) : (
                task.assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 py-1">
                    {/* Avatar */}
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt={a.full_name}
                        className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0 ring-1 ring-gray-200 dark:ring-gray-700">
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                          {getInitials(a.full_name)}
                        </span>
                      </div>
                    )}

                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                      {a.full_name}
                      {a.predicted_sub_location && (
                        <span className="text-gray-400 ml-1">· {a.predicted_sub_location}</span>
                      )}
                    </span>

                    {/* Draft / Confirmed badge */}
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                      a.is_draft
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    )}>
                      {a.is_draft ? l.assignedDraft : l.assignedConfirmed}
                    </span>
                  </div>
                ))
              )}

              {/* Empty spots */}
              {Array.from({ length: Math.max(task.spots_available - task.assignments.length, 0) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-2.5 py-1 opacity-40">
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 shrink-0" />
                  <span className="text-xs text-gray-400 italic">{l.noAssignments}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const l = L[language as Language] ?? L.nl;

  const [event, setEvent] = useState<EventData | null>(null);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoFilling, setAutoFilling] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);

    const [evRes, taskRes] = await Promise.all([
      (supabase as any).from('events').select('id, title, event_date, kickoff_time, location, club_id').eq('id', eventId).single(),
      supabase
        .from('tasks')
        .select(`id, title, location, start_time, end_time, spots_available, status,
          task_signups(id, volunteer_id, status, predicted_sub_location)`)
        .eq('event_id', eventId)
        .order('start_time', { nullsFirst: false }),
    ]);

    if (evRes.data) setEvent(evRes.data);

    if (taskRes.data) {
      // Collect all volunteer_ids for profile fetch
      const vIds = [
        ...new Set(
          taskRes.data.flatMap((t: any) =>
            (t.task_signups || []).map((s: any) => s.volunteer_id)
          )
        ),
      ] as string[];

      // Fetch is_draft separately (not in generated types yet)
      const draftRes = await (supabase as any)
        .from('task_signups')
        .select('id, is_draft')
        .in('task_id', taskRes.data.map((t: any) => t.id));

      const draftMap = new Map<string, boolean>(
        (draftRes.data || []).map((r: any) => [r.id, r.is_draft])
      );

      let profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (vIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', vIds);
        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      setTasks(
        taskRes.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          location: t.location,
          start_time: t.start_time,
          end_time: t.end_time,
          spots_available: t.spots_available ?? 1,
          status: t.status,
          assignments: (t.task_signups || []).map((s: any) => ({
            id: s.id,
            volunteer_id: s.volunteer_id,
            status: s.status,
            is_draft: draftMap.get(s.id) ?? false,
            predicted_sub_location: s.predicted_sub_location,
            full_name: profileMap.get(s.volunteer_id)?.full_name ?? '–',
            avatar_url: profileMap.get(s.volunteer_id)?.avatar_url ?? null,
          })),
        }))
      );
    }

    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalSpots   = tasks.reduce((s, t) => s + t.spots_available, 0);
  const confirmedN   = tasks.reduce((s, t) => s + t.assignments.filter(a => !a.is_draft).length, 0);
  const draftN       = tasks.reduce((s, t) => s + t.assignments.filter(a => a.is_draft).length, 0);
  const openN        = totalSpots - confirmedN - draftN;
  const hasDrafts    = draftN > 0;
  const hasOpenSpots = openN > 0;

  // ── Auto-fill handler ──────────────────────────────────────────────────────

  const handleAutoFill = async () => {
    if (!eventId) return;
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.rpc(
        'predict_and_assign_shifts' as any,
        { p_event_id: eventId }
      );
      if (error) throw error;
      const n = (data as any)?.assigned ?? 0;
      toast.success(l.assignResult.replace('{n}', String(n)));
      await loadData();
    } catch {
      toast.error(l.assignError);
    } finally {
      setAutoFilling(false);
    }
  };

  // ── Publish handler ────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!eventId) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.rpc(
        'publish_event_assignments' as any,
        { p_event_id: eventId }
      );
      if (error) throw error;

      // Send push notification to each newly confirmed volunteer
      const volunteers = (data as any[]) || [];
      await Promise.allSettled(
        volunteers.map((v: any) =>
          supabase.functions.invoke('send-native-push', {
            body: {
              type: 'shift_assigned',
              user_id: v.volunteer_id,
              title: event?.title ?? 'Nieuw shift',
              message: `Je bent ingeroosterd voor "${v.task_title}"${v.task_start_time ? ` om ${fmtTime(v.task_start_time)}` : ''}.`,
              url: '/dashboard',
              club_id: clubId,
            },
          })
        )
      );

      toast.success(l.publishDone);
      await loadData();
    } catch {
      toast.error(l.publishError);
    } finally {
      setPublishing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <p className="text-sm text-gray-400">Evenement niet gevonden.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 flex items-center gap-3 h-14">
        <button
          onClick={() => navigate('/events-manager')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{l.back}</span>
        </button>
        <div className="h-4 w-px bg-gray-200 dark:border-gray-700" />
        <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex-1">{event.title}</h1>
        <button onClick={loadData} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Event info card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {event.event_date && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 text-gray-400" />
                {fmtDate(event.event_date)}
              </span>
            )}
            {event.kickoff_time && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 text-gray-400" />
                {l.kickoff}: {event.kickoff_time.slice(0, 5)}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500 truncate">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                {event.location}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{tasks.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{tasks.length === 1 ? l.tasks : l.tasksPlural}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{confirmedN}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l.filled}</p>
            </div>
            {draftN > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{draftN}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l.draft}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-bold text-gray-400">{openN}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l.open}</p>
            </div>
          </div>
        </div>

        {/* ── Status banner ── */}
        <AnimatePresence>
          {hasDrafts && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
            >
              <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <span className="font-semibold">{draftN} {l.draft}</span>
                {' '}{l.hasDrafts}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ACTION BUTTONS ── */}
        <div className="space-y-3">

          {/* ✨ Auto-fill gradient button */}
          {(hasOpenSpots || hasDrafts) && (
            <motion.button
              onClick={handleAutoFill}
              disabled={autoFilling || publishing}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full h-16 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-3',
                'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500',
                'hover:from-violet-700 hover:via-blue-700 hover:to-cyan-600',
                'shadow-lg shadow-violet-500/20 dark:shadow-violet-900/30',
                'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {autoFilling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{l.autoFilling}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <div className="text-left">
                    <span>{l.autoFill} </span>
                    <span className="opacity-70 text-sm font-normal">{l.autoFillBeta}</span>
                  </div>
                  <Zap className="w-4 h-4 opacity-60 ml-auto" />
                </>
              )}
            </motion.button>
          )}

          {/* Algorithm description */}
          {hasOpenSpots && !autoFilling && (
            <p className="text-xs text-center text-gray-400">{l.autoFillDesc}</p>
          )}

          {/* All filled notice */}
          {!hasOpenSpots && !hasDrafts && tasks.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{l.allFilled}</p>
            </div>
          )}

          {/* Publish button */}
          {hasDrafts && (
            <motion.button
              onClick={handlePublish}
              disabled={publishing || autoFilling}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2',
                'bg-emerald-600 hover:bg-emerald-700 text-white',
                'shadow-sm shadow-emerald-500/20',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{l.publishing}</>
              ) : (
                <><Send className="w-4 h-4" />{l.publish}</>
              )}
            </motion.button>
          )}
        </div>

        {/* ── Task list ── */}
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{l.noTasks}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{l.noTasksDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <TaskCard key={task.id} task={task} l={l} defaultExpanded={i < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
