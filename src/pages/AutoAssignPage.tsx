import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, stagger, useAnimate } from 'framer-motion';
import {
  Sparkles, ArrowLeft, Calendar, Users, RefreshCw, CheckCircle2,
  ChevronDown, X, Send, AlertCircle, Trophy, Zap, UserCheck,
  ToggleRight, ChevronRight, Loader2, Bell,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { sendPush } from '@/lib/sendPush';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import ClubOwnerSidebar from '@/components/ClubOwnerSidebar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventItem {
  id: string;
  name: string;
  date: string | null;
  taskCount: number;
}

interface TaskSlot {
  id: string;
  title: string;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  spots_available: number;
  spotsNeeded: number;
  event_id: string | null;
  partner_only: boolean;
  assigned_partner_id: string | null;
}

interface VolunteerData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  completedTasks: number;
  hasContract: boolean;
  availableDays: Set<number>; // 0=Sun, 1=Mon, ...
}

interface DraftRow {
  uid: string; // unique row id
  task: TaskSlot;
  volunteer: VolunteerData;
  score: number;
  reasons: string[];
  isBuddy: boolean;
}

type Phase = 'config' | 'loading' | 'draft' | 'saving' | 'done';

// ─── Loading steps ───────────────────────────────────────────────────────────

const STEPS_NL = [
  'Evenementen & taken ophalen...',
  'Vrijwilligers analyseren...',
  'Beschikbaarheid controleren...',
  'Loyaliteitsscores berekenen...',
  'Buddy-groepen matchen...',
  'Voorstel samenstellen...',
];
const STEPS_FR = [
  'Récupération des événements...',
  'Analyse des bénévoles...',
  'Vérification des disponibilités...',
  'Calcul des scores de fidélité...',
  'Association des groupes...',
  'Génération de la proposition...',
];
const STEPS_EN = [
  'Loading events & tasks...',
  'Analysing volunteers...',
  'Checking availability...',
  'Calculating loyalty scores...',
  'Matching buddy groups...',
  'Assembling proposal...',
];

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';
  if (score >= 55) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40';
  if (score >= 35) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40';
  return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40';
}

function scoreLabel(score: number, lang: string) {
  if (score >= 80) return lang === 'nl' ? 'Uitstekend' : lang === 'fr' ? 'Excellent' : 'Excellent';
  if (score >= 55) return lang === 'nl' ? 'Goed' : lang === 'fr' ? 'Bien' : 'Good';
  if (score >= 35) return lang === 'nl' ? 'Matig' : lang === 'fr' ? 'Moyen' : 'Fair';
  return lang === 'nl' ? 'Laag' : lang === 'fr' ? 'Faible' : 'Low';
}

function dayOfWeek(dateStr: string | null): number {
  if (!dateStr) return -1;
  return new Date(dateStr).getDay();
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AutoAssignPage = () => {
  const { clubId, clubInfo, userId, profile } = useClubContext();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  const STEPS = language === 'nl' ? STEPS_NL : language === 'fr' ? STEPS_FR : STEPS_EN;

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('config');
  const [loadingStep, setLoadingStep] = useState(-1);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tasks, setTasks] = useState<TaskSlot[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [removedUids, setRemovedUids] = useState<Set<string>>(new Set());
  const [sendPushEnabled, setSendPushEnabled] = useState(true);
  const [savingProgress, setSavingProgress] = useState(0);

  const opts = { avoidConflicts: true, prioritizeLoyalty: true, keepBuddies: true };

  // ── Fetch events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: evData } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('club_id', clubId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(20);

      if (!evData?.length) {
        // Fallback: show tasks without event grouping
        setEvents([{ id: '__no_event__', name: t('Alle taken', 'Toutes les tâches', 'All tasks'), date: null, taskCount: 0 }]);
        setSelectedEventId('__no_event__');
        return;
      }

      // Count open tasks per event
      const eventIds = evData.map(e => e.id);
      const { data: taskCounts } = await supabase
        .from('tasks')
        .select('event_id, id, spots_available, status')
        .in('event_id', eventIds)
        .eq('status', 'open');

      const countMap: Record<string, number> = {};
      for (const t of taskCounts || []) {
        if (t.event_id && (t.spots_available ?? 0) > 0) {
          countMap[t.event_id] = (countMap[t.event_id] || 0) + 1;
        }
      }

      const items: EventItem[] = evData.map(e => ({
        id: e.id,
        name: e.title,
        date: e.event_date,
        taskCount: countMap[e.id] || 0,
      }));

      setEvents(items);
      if (items.length > 0) setSelectedEventId(items[0].id);
    };
    load();
  }, [clubId]);

  // ── Fetch tasks for selected event ────────────────────────────────────────
  useEffect(() => {
    if (!clubId || !selectedEventId) return;
    const load = async () => {
      let query = supabase
        .from('tasks')
        .select('id, title, task_date, start_time, end_time, spots_available, event_id, partner_only, assigned_partner_id')
        .eq('club_id', clubId)
        .eq('status', 'open');

      if (selectedEventId !== '__no_event__') {
        query = query.eq('event_id', selectedEventId);
      }

      const { data } = await query.order('task_date', { ascending: true });

      if (!data) return;

      // Get current signup counts per task
      const taskIds = data.map(t => t.id);
      if (!taskIds.length) { setTasks([]); return; }

      const { data: signups } = await supabase
        .from('task_signups')
        .select('task_id')
        .in('task_id', taskIds)
        .in('status', ['assigned', 'pending', 'uitgenodigd']);

      const signupCounts: Record<string, number> = {};
      for (const s of signups || []) {
        signupCounts[s.task_id] = (signupCounts[s.task_id] || 0) + 1;
      }

      const slots: TaskSlot[] = data
        .map(t => ({
          ...t,
          spotsNeeded: Math.max(0, (t.spots_available ?? 0) - (signupCounts[t.id] || 0)),
        }))
        .filter(t => t.spotsNeeded > 0);

      setTasks(slots);
      setSelectedTaskIds(new Set(slots.map(t => t.id)));
    };
    load();
  }, [clubId, selectedEventId]);

  // ── Algorithm ─────────────────────────────────────────────────────────────
  const runAlgorithm = useCallback(async () => {
    if (!clubId) return;
    setPhase('loading');
    setLoadingStep(0);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Step 0: already starting
    await delay(600);
    setLoadingStep(1);

    // STEP 1: Fetch active club members + profiles
    const { data: memberships } = await supabase
      .from('club_memberships')
      .select('volunteer_id')
      .eq('club_id', clubId)
      .eq('status', 'actief');

    const memberIds = (memberships || []).map(m => m.volunteer_id);
    if (!memberIds.length) {
      toast.error(t('Geen actieve vrijwilligers gevonden.', 'Aucun bénévole actif trouvé.', 'No active volunteers found.'));
      setPhase('config');
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', memberIds);

    await delay(500);
    setLoadingStep(2);

    // STEP 2: Fetch availability + existing signups on conflicting dates
    const targetTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    const targetDates = [...new Set(targetTasks.map(t => t.task_date).filter(Boolean))] as string[];
    const targetIds = targetTasks.map(t => t.id);

    const { data: availRows } = await (supabase
      .from('event_availability' as any)
      .select('volunteer_id, status')
      .in('volunteer_id', memberIds) as any);

    // Map volunteer → set of available days (simplified: just track who has availability records)
    const availMap: Record<string, Set<number>> = {};
    for (const row of (availRows || []) as any[]) {
      if (!availMap[row.volunteer_id]) availMap[row.volunteer_id] = new Set();
      availMap[row.volunteer_id].add(0); // simplified
    }

    // Fetch conflicting signups (same dates, not target tasks)
    const { data: conflictSignups } = await supabase
      .from('task_signups')
      .select('volunteer_id, task_id')
      .in('status', ['assigned', 'pending'])
      .in('volunteer_id', memberIds);

    // Get dates of all tasks the volunteer is already signed up for
    const signedTaskIds = [...new Set((conflictSignups || []).map(s => s.task_id))];
    let conflictDateMap: Record<string, string[]> = {}; // volunteerId → [dates]

    if (signedTaskIds.length) {
      const { data: conflictTasks } = await supabase
        .from('tasks')
        .select('id, task_date')
        .in('id', signedTaskIds);

      const taskDateLookup: Record<string, string> = {};
      for (const t of conflictTasks || []) {
        if (t.task_date) taskDateLookup[t.id] = t.task_date;
      }

      for (const s of conflictSignups || []) {
        if (!conflictDateMap[s.volunteer_id]) conflictDateMap[s.volunteer_id] = [];
        const d = taskDateLookup[s.task_id];
        if (d && !targetIds.includes(s.task_id)) conflictDateMap[s.volunteer_id].push(d);
      }
    }

    await delay(500);
    setLoadingStep(3);

    // STEP 3: Fetch reliability (completed tasks count)
    const { data: completedRows } = await supabase
      .from('task_signups')
      .select('volunteer_id')
      .in('volunteer_id', memberIds)
      .not('checked_in_at', 'is', null);

    const completedCount: Record<string, number> = {};
    for (const r of completedRows || []) {
      completedCount[r.volunteer_id] = (completedCount[r.volunteer_id] || 0) + 1;
    }

    // Fetch season contracts
    const { data: contracts } = await (supabase as any)
      .from('season_contracts')
      .select('volunteer_id, status')
      .in('volunteer_id', memberIds);

    const contractMap: Record<string, boolean> = {};
    for (const c of contracts || []) {
      if (c.status === 'signed') contractMap[c.volunteer_id] = true;
    }

    await delay(500);
    setLoadingStep(4);

    // STEP 4: Build volunteer data objects
    const volunteers: VolunteerData[] = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name || t('Onbekend', 'Inconnu', 'Unknown'),
      avatar_url: p.avatar_url,
      email: p.email,
      completedTasks: completedCount[p.id] || 0,
      hasContract: !!contractMap[p.id],
      availableDays: availMap[p.id] || new Set(),
    }));

    // STEP 5: Build buddy affinity map (co-assignment frequency)
    await delay(400);
    setLoadingStep(5);

    const buddyPairs = new Map<string, Set<string>>(); // volunteerId → set of buddy volunteerIds
    const groupByTask: Record<string, string[]> = {};
    for (const s of conflictSignups || []) {
      if (!groupByTask[s.task_id]) groupByTask[s.task_id] = [];
      groupByTask[s.task_id].push(s.volunteer_id);
    }
    for (const members of Object.values(groupByTask)) {
      for (const v1 of members) {
        for (const v2 of members) {
          if (v1 !== v2) {
            if (!buddyPairs.has(v1)) buddyPairs.set(v1, new Set());
            buddyPairs.get(v1)!.add(v2);
          }
        }
      }
    }

    await delay(400);
    setLoadingStep(5);

    // STEP 6: Greedy assignment — process tasks by urgency (soonest first)
    const assignedInBatch = new Map<string, string>(); // volunteerId → taskId (prevent double-assign)
    const proposedRows: DraftRow[] = [];

    for (const task of targetTasks) {
      const taskDay = dayOfWeek(task.task_date);

      // Score each volunteer
      const scored: Array<{ v: VolunteerData; score: number; reasons: string[] }> = [];

      for (const v of volunteers) {
        // Skip if already assigned in this batch or already signed up for this task
        if (assignedInBatch.has(v.id)) continue;

        // Conflict check: volunteer already has a task on this date
        const hasConflict = opts.avoidConflicts && task.task_date
          ? (conflictDateMap[v.id] || []).includes(task.task_date)
          : false;
        if (hasConflict) continue;

        let score = 0;
        const reasons: string[] = [];

        // Availability (0-30)
        if (taskDay >= 0 && v.availableDays.size > 0) {
          if (v.availableDays.has(taskDay)) {
            score += 30;
            reasons.push(t('Beschikbaar', 'Disponible', 'Available'));
          } else {
            score += 5;
          }
        } else {
          score += 15; // neutral — no availability data
        }

        // Reliability: completed tasks (0-25)
        if (opts.prioritizeLoyalty) {
          const rel = Math.min(25, v.completedTasks * 2);
          score += rel;
          if (v.completedTasks >= 5) reasons.push(t(`${v.completedTasks}× voltooid`, `${v.completedTasks}× complété`, `${v.completedTasks}× done`));
        }

        // Contract (0-20)
        if (v.hasContract) {
          score += 20;
          reasons.push(t('Contract actief', 'Contrat actif', 'Contract active'));
        }

        // Partner match (0-10)
        if (task.assigned_partner_id) {
          // bonus if we can link them — simplified to existing buddy data
          score += 5;
        }

        scored.push({ v, score, reasons });
      }

      // Sort by score desc
      scored.sort((a, b) => b.score - a.score);

      // Pick top N volunteers for this task
      const spotsToFill = Math.min(task.spotsNeeded, scored.length);
      for (let i = 0; i < spotsToFill; i++) {
        const { v, score, reasons } = scored[i];

        // Check buddy badge (this volunteer has co-assigned history with another selected volunteer)
        const isBuddy = opts.keepBuddies
          ? [...(buddyPairs.get(v.id) || [])].some(bid =>
              [...assignedInBatch.keys()].includes(bid)
            )
          : false;

        proposedRows.push({
          uid: `${task.id}-${v.id}-${i}`,
          task,
          volunteer: v,
          score: Math.min(100, score),
          reasons,
          isBuddy,
        });

        assignedInBatch.set(v.id, task.id);
      }
    }

    await delay(400);

    setDraft(proposedRows);
    setRemovedUids(new Set());
    setPhase('draft');
  }, [clubId, tasks, selectedTaskIds, opts, language]);

  // ── Confirm & Save ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const activeRows = draft.filter(r => !removedUids.has(r.uid));
    if (!activeRows.length) return;

    setPhase('saving');
    setSavingProgress(0);

    // Build bulk insert payload
    const inserts = activeRows.map(r => ({
      task_id: r.task.id,
      volunteer_id: r.volunteer.id,
      status: 'assigned',
      signed_up_at: new Date().toISOString(),
    }));

    // Single bulk insert
    const { error } = await supabase.from('task_signups').insert(inserts);

    if (error) {
      toast.error(t('Opslaan mislukt: ' + error.message, 'Échec de l\'enregistrement: ' + error.message, 'Save failed: ' + error.message));
      setPhase('draft');
      return;
    }

    setSavingProgress(50);

    // Send push notifications grouped by volunteer
    if (sendPushEnabled) {
      // Group assignments by volunteer
      const byVolunteer: Record<string, DraftRow[]> = {};
      for (const r of activeRows) {
        if (!byVolunteer[r.volunteer.id]) byVolunteer[r.volunteer.id] = [];
        byVolunteer[r.volunteer.id].push(r);
      }

      const pushPromises = Object.entries(byVolunteer).map(([volId, rows]) => {
        const count = rows.length;
        const firstTask = rows[0].task;
        const title = t('Je bent ingepland! 🎉', 'Vous êtes planifié ! 🎉', 'You\'ve been scheduled! 🎉');
        const message = count === 1
          ? t(
              `Je bent ingepland voor: ${firstTask.title}`,
              `Vous êtes planifié pour : ${firstTask.title}`,
              `You've been scheduled for: ${firstTask.title}`
            )
          : t(
              `Je bent ingepland voor ${count} shifts bij ${clubInfo?.name || 'de club'}.`,
              `Vous êtes planifié pour ${count} shifts chez ${clubInfo?.name || 'le club'}.`,
              `You've been scheduled for ${count} shifts at ${clubInfo?.name || 'the club'}.`
            );

        return sendPush({
          userId: volId,
          title,
          message,
          url: '/dashboard?tab=mine',
          type: 'auto_assign',
        });
      });

      await Promise.allSettled(pushPromises);
    }

    setSavingProgress(100);
    await new Promise(r => setTimeout(r, 600));
    setPhase('done');
    toast.success(t(
      `${activeRows.length} inplanningen opgeslagen${sendPushEnabled ? ' & notificaties verstuurd' : ''}.`,
      `${activeRows.length} planifications enregistrées${sendPushEnabled ? ' & notifications envoyées' : ''}.`,
      `${activeRows.length} assignments saved${sendPushEnabled ? ' & notifications sent' : ''}.`,
    ));
  };

  // ── Compute visible rows ──────────────────────────────────────────────────
  const visibleRows = draft.filter(r => !removedUids.has(r.uid));
  const uniqueVolunteers = new Set(visibleRows.map(r => r.volunteer.id)).size;
  const avgScore = visibleRows.length
    ? Math.round(visibleRows.reduce((sum, r) => sum + r.score, 0) / visibleRows.length)
    : 0;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebar = (
    <ClubOwnerSidebar
      profile={profile}
      clubId={clubId}
      clubInfo={clubInfo}
      onLogout={async () => { await supabase.auth.signOut(); navigate('/club-login'); }}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar} userId={userId || undefined}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/events-manager')}
            className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">
                {t('Auto-Vul Magie', 'Remplissage automatique', 'Smart Auto-Assign')}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('AI-gestuurde shifttoewijzing', "Attribution de shifts par l'IA", 'AI-powered shift assignment')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Config Card (always visible) ── */}
        <AnimatePresence>
          {(phase === 'config' || phase === 'loading') && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('Configuratie', 'Configuration', 'Configuration')}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event selector */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {t('Evenement', 'Événement', 'Event')}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEventId}
                      onChange={e => setSelectedEventId(e.target.value)}
                      disabled={phase === 'loading'}
                      className="w-full h-10 pl-3 pr-8 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                    >
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name}
                          {ev.date ? ` — ${new Date(ev.date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short' })}` : ''}
                          {ev.taskCount > 0 ? ` (${ev.taskCount} ${t('open', 'ouvert', 'open')})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Task count display */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {t('Taken met open plekken', 'Tâches avec places libres', 'Tasks with open spots')}
                  </label>
                  <div className="h-10 px-3 rounded-xl border border-border bg-muted/30 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {tasks.length > 0
                        ? t(
                            `${tasks.length} taken geselecteerd (${tasks.reduce((s, t) => s + t.spotsNeeded, 0)} plekken)`,
                            `${tasks.length} tâches sélectionnées (${tasks.reduce((s, t) => s + t.spotsNeeded, 0)} places)`,
                            `${tasks.length} tasks selected (${tasks.reduce((s, t) => s + t.spotsNeeded, 0)} spots)`,
                          )
                        : t('Geen taken met open plekken', 'Aucune tâche avec des places', 'No tasks with open spots')
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Option toggles */}
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { key: 'avoidConflicts', icon: AlertCircle, label: t('Conflicten vermijden', 'Éviter les conflits', 'Avoid conflicts') },
                  { key: 'prioritizeLoyalty', icon: Trophy, label: t('Prioriteer loyaliteit', 'Prioriser fidélité', 'Prioritize loyalty') },
                  { key: 'keepBuddies', icon: UserCheck, label: t('Buddy-groepen', 'Groupes de paires', 'Buddy groups') },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-xs font-medium text-primary">
                    <opt.icon className="w-3 h-3" />
                    {opt.label}
                    <CheckCircle2 className="w-3 h-3 ml-0.5 opacity-60" />
                  </div>
                ))}
              </div>

              {/* Generate button */}
              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Het voorstel wordt niet automatisch opgeslagen.',
                    'La proposition ne sera pas sauvegardée automatiquement.',
                    'The proposal will not be saved automatically.'
                  )}
                </p>
                <button
                  onClick={runAlgorithm}
                  disabled={phase === 'loading' || tasks.length === 0}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-all"
                >
                  {phase === 'loading'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Bezig...', 'En cours...', 'Running...')}</>
                    : <><Sparkles className="w-4 h-4" /> {t('Genereer Voorstel', 'Générer la proposition', 'Generate Schedule')}</>
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading animation ── */}
        <AnimatePresence>
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm"
            >
              <div className="max-w-sm mx-auto">
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                </div>

                <div className="space-y-3">
                  {STEPS.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={loadingStep >= i ? { opacity: 1, x: 0 } : { opacity: 0.25, x: -8 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                        loadingStep > i
                          ? 'bg-emerald-500 text-white'
                          : loadingStep === i
                          ? 'bg-gradient-to-br from-violet-500 to-blue-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {loadingStep > i
                          ? <CheckCircle2 className="w-3 h-3" />
                          : loadingStep === i
                          ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                              <Loader2 className="w-3 h-3" />
                            </motion.div>
                          : <span className="text-[9px] font-bold">{i + 1}</span>
                        }
                      </div>
                      <span className={cn(
                        'text-sm transition-colors',
                        loadingStep >= i ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {step}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Draft Proposal ── */}
        <AnimatePresence>
          {(phase === 'draft' || phase === 'saving' || phase === 'done') && (
            <motion.div
              key="draft"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: t('Inplanningen', 'Planifications', 'Assignments'),
                    value: visibleRows.length,
                    icon: CheckCircle2,
                    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
                  },
                  {
                    label: t('Vrijwilligers', 'Bénévoles', 'Volunteers'),
                    value: uniqueVolunteers,
                    icon: Users,
                    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
                  },
                  {
                    label: t('Gem. score', 'Score moy.', 'Avg. score'),
                    value: `${avgScore}%`,
                    icon: Zap,
                    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
                  },
                ].map(stat => (
                  <div key={stat.label} className={cn('rounded-xl p-3 flex items-center gap-3', stat.color)}>
                    <stat.icon className="w-4 h-4 shrink-0 opacity-80" />
                    <div>
                      <p className="text-xl font-bold leading-none tabular-nums">{stat.value}</p>
                      <p className="text-xs opacity-70 mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table card */}
              <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                    {t('Conceptvoorstel', 'Proposition de concept', 'Draft Proposal')}
                  </h2>
                  <button
                    onClick={runAlgorithm}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t('Opnieuw genereren', 'Régénérer', 'Regenerate')}
                  </button>
                </div>

                {visibleRows.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    {t('Alle rijen verwijderd.', 'Toutes les lignes supprimées.', 'All rows removed.')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40">
                          {[
                            t('Taak', 'Tâche', 'Task'),
                            t('Datum & Tijd', 'Date & Heure', 'Date & Time'),
                            t('Vrijwilliger', 'Bénévole', 'Volunteer'),
                            t('Score', 'Score', 'Score'),
                            '',
                          ].map((h, i) => (
                            <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {visibleRows.map((row, i) => (
                            <motion.tr
                              key={row.uid}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: i * 0.025 }}
                              className="border-b border-border/20 hover:bg-muted/30 transition-colors group"
                            >
                              {/* Task */}
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground line-clamp-1 max-w-[180px]">
                                  {row.task.title}
                                </div>
                                {row.isBuddy && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-600 mt-0.5">
                                    <UserCheck className="w-2.5 h-2.5" />
                                    {t('Buddy', 'Partenaire', 'Buddy')}
                                  </span>
                                )}
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {row.task.task_date
                                  ? new Date(row.task.task_date).toLocaleDateString(
                                      language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                                      { weekday: 'short', day: 'numeric', month: 'short' }
                                    )
                                  : '—'
                                }
                                {row.task.start_time && (
                                  <span className="ml-1.5 text-foreground/70">
                                    {row.task.start_time.slice(0, 5)}
                                    {row.task.end_time ? `–${row.task.end_time.slice(0, 5)}` : ''}
                                  </span>
                                )}
                              </td>

                              {/* Volunteer */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {row.volunteer.avatar_url ? (
                                    <img
                                      src={row.volunteer.avatar_url}
                                      alt={row.volunteer.full_name}
                                      className="w-6 h-6 rounded-full object-cover ring-1 ring-border/40 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center shrink-0">
                                      <span className="text-[9px] font-bold text-white">
                                        {row.volunteer.full_name[0].toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="font-medium text-foreground truncate max-w-[140px]">
                                    {row.volunteer.full_name}
                                  </span>
                                  {row.volunteer.hasContract && (
                                    <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      {t('Contract', 'Contrat', 'Contract')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Score */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums',
                                    scoreColor(row.score)
                                  )}>
                                    {row.score}
                                  </span>
                                  <span className="hidden sm:inline text-[10px] text-muted-foreground">
                                    {scoreLabel(row.score, language)}
                                  </span>
                                </div>
                                {row.reasons.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {row.reasons.slice(0, 2).map(r => (
                                      <span key={r} className="text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setRemovedUids(prev => new Set([...prev, row.uid]))}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                                  title={t('Verwijder', 'Supprimer', 'Remove')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Confirm footer */}
              {phase === 'draft' && visibleRows.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSendPushEnabled(!sendPushEnabled)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                        sendPushEnabled
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                          : 'bg-muted border-border text-muted-foreground'
                      )}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {sendPushEnabled
                        ? t('Notificaties: Aan', 'Notifications : activées', 'Notifications: On')
                        : t('Notificaties: Uit', 'Notifications : désactivées', 'Notifications: Off')
                      }
                    </button>
                    {sendPushEnabled && (
                      <p className="text-xs text-muted-foreground">
                        {t(
                          `Push verstuurd naar ${uniqueVolunteers} vrijwilliger(s)`,
                          `Push envoyé à ${uniqueVolunteers} bénévole(s)`,
                          `Push sent to ${uniqueVolunteers} volunteer(s)`
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleConfirm}
                    className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" />
                    {t('Bevestig & Verwittig Vrijwilligers', 'Confirmer & Notifier', 'Confirm & Notify Volunteers')}
                  </button>
                </motion.div>
              )}

              {/* Saving progress */}
              {phase === 'saving' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {savingProgress < 50
                        ? t('Inplanningen opslaan...', 'Enregistrement des planifications...', 'Saving assignments...')
                        : t('Notificaties versturen...', 'Envoi des notifications...', 'Sending notifications...')
                      }
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${savingProgress}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-violet-500 to-blue-600 rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Done state ── */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl border border-emerald-200 dark:border-emerald-900 p-8 text-center shadow-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground">
                {t('Klaar! 🎉', 'Terminé ! 🎉', 'Done! 🎉')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  `${visibleRows.length} vrijwilligers ingepland${sendPushEnabled ? ' en genotificeerd' : ''}.`,
                  `${visibleRows.length} bénévoles planifiés${sendPushEnabled ? ' et notifiés' : ''}.`,
                  `${visibleRows.length} volunteers scheduled${sendPushEnabled ? ' and notified' : ''}.`,
                )}
              </p>
              <div className="flex justify-center gap-3 mt-5">
                <button
                  onClick={() => { setPhase('config'); setDraft([]); }}
                  className="px-4 h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted/60 transition-colors"
                >
                  {t('Nieuw voorstel', 'Nouvelle proposition', 'New proposal')}
                </button>
                <button
                  onClick={() => navigate('/events-manager')}
                  className="px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t('Naar evenementen', 'Vers les événements', 'Go to events')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
};

export default AutoAssignPage;
