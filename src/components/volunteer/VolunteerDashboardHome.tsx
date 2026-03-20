import { useEffect, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, CheckCircle, ClipboardList, FileText, AlertTriangle, BookOpen, Layers, ChevronDown, Sparkles, FileSignature, Wallet, Search, ArrowRight, Heart, Clock, LayoutList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import OnboardingWizard from '@/components/OnboardingWizard';
import VolunteerActivitiesSection from '@/components/VolunteerActivitiesSection';
import ComplianceBadge from '@/components/ComplianceBadge';

import TodayPlanningSection from '@/components/volunteer/TodayPlanningSection';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Shield } from 'lucide-react';
const VolunteerSafetyTab = lazy(() => import('@/components/VolunteerSafetyTab'));
import type { VolunteerTask, TaskSignup, VolunteerPayment, SignatureContract, SepaPayoutItem, VolunteerEventData } from '@/types/volunteer';
import { volunteerDashboardLabels } from '@/types/volunteer';

interface FollowedClubTask {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  club_id: string;
  signup_count: number;
  clubs: { name: string; logo_url?: string | null } | null;
}

interface ScoredTask {
  task: VolunteerTask;
  score: number;
  reasons: string[];
}

interface Props {
  language: Language;
  currentUserId: string;
  profile: { full_name: string; email: string; avatar_url?: string | null } | null;
  followedClubIds: Set<string> | null;
  myContracts: SignatureContract[];
  myCertifiedTrainingIds: Set<string>;
  signups: TaskSignup[];
  tasks: VolunteerTask[];
  events: VolunteerEventData[];
  myPayments: VolunteerPayment[];
  sepaPayouts: SepaPayoutItem[];
  pendingSignups: TaskSignup[];
  assignedSignups: TaskSignup[];
  complianceData: any;
  loyaltyEnrollments: Record<string, { tasks_completed: number; points_earned: number; reward_claimed: boolean }>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: string) => void;
  setShowProfileDialog: (v: boolean) => void;
  getSignupStatus: (taskId: string) => string | null;
}

const VolunteerDashboardHome = ({
  language, currentUserId, profile, followedClubIds, myContracts, myCertifiedTrainingIds,
  signups, tasks, events, myPayments, sepaPayouts, pendingSignups, assignedSignups,
  complianceData, loyaltyEnrollments, searchQuery, setSearchQuery, setActiveTab, setShowProfileDialog, getSignupStatus,
}: Props) => {
  const navigate = useNavigate();
  const dt = volunteerDashboardLabels[language as keyof typeof volunteerDashboardLabels] || volunteerDashboardLabels.nl;
  const [upcomingBriefings, setUpcomingBriefings] = useState<{ taskId: string; taskTitle: string; taskDate: string }[]>([]);
  const [activeSafetyAlert, setActiveSafetyAlert] = useState(false);
  const [safetySheetOpen, setSafetySheetOpen] = useState(false);
  const [requiredTrainings, setRequiredTrainings] = useState<{ id: string; title: string; clubName: string }[]>([]);
  const [zoneAssignments, setZoneAssignments] = useState<Record<string, string>>({});
  const [followedClubTasksRaw, setFollowedClubTasksRaw] = useState<FollowedClubTask[]>([]);
  const [prefs, setPrefs] = useState<{ categories?: string[]; time_prefs?: string[] } | null>(null);
  const [recommendedTasks, setRecommendedTasks] = useState<ScoredTask[]>([]);
  // Check for unread briefings within 48h
  useEffect(() => {
    if (!currentUserId || signups.length === 0) return;
    const checkBriefings = async () => {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      // Get upcoming assigned task ids
      const upcomingTaskIds = tasks
        .filter(t => {
          const status = signups.find(s => s.task_id === t.id)?.status;
          if (status !== 'assigned' && status !== 'pending') return false;
          if (!t.task_date) return false;
          const d = new Date(t.task_date);
          return d >= now && d <= in48h;
        })
        .map(t => t.id);
      if (upcomingTaskIds.length === 0) return;

      const { data: briefingsData } = await supabase
        .from('briefings')
        .select('id, title, task_id')
        .in('task_id', upcomingTaskIds);
      if (!briefingsData || briefingsData.length === 0) return;

      // Check which ones the user has NOT completed all blocks for
      const result: typeof upcomingBriefings = [];
      for (const b of briefingsData) {
        const { data: blockData } = await supabase
          .from('briefing_groups')
          .select('id')
          .eq('briefing_id', b.id);
        if (!blockData || blockData.length === 0) continue;
        const groupIds = blockData.map(g => g.id);
        const { data: blocks } = await supabase
          .from('briefing_blocks')
          .select('id')
          .in('group_id', groupIds);
        if (!blocks || blocks.length === 0) continue;
        const blockIds = blocks.map(bl => bl.id);
        const { data: progress } = await supabase
          .from('briefing_block_progress')
          .select('block_id')
          .in('block_id', blockIds)
          .eq('volunteer_id', currentUserId)
          .eq('completed', true);
        const completedCount = progress?.length || 0;
        if (completedCount < blockIds.length) {
          const task = tasks.find(t => t.id === b.task_id);
          result.push({ taskId: b.task_id, taskTitle: task?.title || b.title, taskDate: task?.task_date || '' });
        }
      }
      setUpcomingBriefings(result);
    };
    checkBriefings();
  }, [currentUserId, signups, tasks]);

  // Fetch zone assignments for upcoming tasks
  useEffect(() => {
    if (!currentUserId || signups.length === 0) return;
    const fetchZones = async () => {
      const myTaskIds = signups.filter(s => s.status === 'assigned' || s.status === 'pending').map(s => s.task_id);
      if (myTaskIds.length === 0) return;
      const { data: zones } = await supabase.from('task_zones').select('id, name, task_id').in('task_id', myTaskIds);
      if (!zones || zones.length === 0) return;
      const zoneIds = zones.map(z => z.id);
      const { data: assignments } = await supabase.from('task_zone_assignments').select('zone_id').eq('volunteer_id', currentUserId).in('zone_id', zoneIds);
      if (!assignments || assignments.length === 0) return;
      const zoneMap = new Map(zones.map(z => [z.id, z]));
      const result: Record<string, string> = {};
      assignments.forEach(a => {
        const zone = zoneMap.get(a.zone_id);
        if (zone) result[zone.task_id] = zone.name;
      });
      setZoneAssignments(result);
    };
    fetchZones();
  }, [currentUserId, signups]);

  // Check for active safety incidents on today's events
  useEffect(() => {
    if (!currentUserId || signups.length === 0) return;
    const checkSafety = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const myTaskIds = signups.filter(s => s.status === 'assigned').map(s => s.task_id);
      if (myTaskIds.length === 0) return;

      const myTasks = tasks.filter(t => myTaskIds.includes(t.id) && t.task_date?.slice(0, 10) === today);
      const eventIds = [...new Set(myTasks.map(t => t.event_id).filter(Boolean))];
      if (eventIds.length === 0) return;

      const { data: incidents } = await supabase
        .from('safety_incidents')
        .select('id')
        .in('event_id', eventIds)
        .neq('status', 'opgelost')
        .limit(1);

      setActiveSafetyAlert((incidents?.length || 0) > 0);
    };
    checkSafety();
  }, [currentUserId, signups, tasks]);

  // Fetch required trainings the volunteer hasn't completed
  useEffect(() => {
    if (!currentUserId || !followedClubIds || followedClubIds.size === 0) return;
    const fetchRequired = async () => {
      const clubIds = [...followedClubIds];
      const { data: reqData } = await supabase.from('club_required_trainings' as any)
        .select('training_id, club_id')
        .in('club_id', clubIds);
      if (!reqData || reqData.length === 0) { setRequiredTrainings([]); return; }

      const trainingIds = [...new Set((reqData as any[]).map(r => r.training_id))];
      const [trainingsRes, certsRes, clubsRes] = await Promise.all([
        supabase.from('academy_trainings').select('id, title, club_id').in('id', trainingIds),
        supabase.from('volunteer_certificates').select('training_id').eq('volunteer_id', currentUserId).in('training_id', trainingIds),
        supabase.from('clubs').select('id, name').in('id', clubIds),
      ]);
      const certifiedIds = new Set((certsRes.data || []).map((c: any) => c.training_id));
      const clubNameMap = new Map((clubsRes.data || []).map((c: any) => [c.id, c.name]));
      const incomplete = (trainingsRes.data || [])
        .filter((t: any) => !certifiedIds.has(t.id))
        .map((t: any) => ({ id: t.id, title: t.title, clubName: clubNameMap.get(t.club_id) || '' }));
      setRequiredTrainings(incomplete);
    };
    fetchRequired();
  }, [currentUserId, followedClubIds, myCertifiedTrainingIds]);

  // Fetch tasks from followed clubs + user preferences
  useEffect(() => {
    if (!currentUserId) return;
    const fetchData = async () => {
      const { data: prefData } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', currentUserId)
        .maybeSingle();
      setPrefs((prefData?.preferences as any) || null);

      if (!followedClubIds || followedClubIds.size === 0) {
        setFollowedClubTasksRaw([]);
        return;
      }
      const clubIds = [...followedClubIds];
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from('tasks')
        .select('id, title, task_date, location, spots_available, club_id, clubs(name, logo_url)')
        .in('club_id', clubIds)
        .eq('status', 'open')
        .gte('task_date', now)
        .order('task_date', { ascending: true })
        .limit(20);
      if (!data) { setFollowedClubTasksRaw([]); return; }
      const taskIds = (data as any[]).map((t: any) => t.id);
      const { data: signupData } = await supabase
        .from('task_signups')
        .select('task_id')
        .in('task_id', taskIds);
      const countMap: Record<string, number> = {};
      (signupData || []).forEach((s: any) => { countMap[s.task_id] = (countMap[s.task_id] || 0) + 1; });
      setFollowedClubTasksRaw(
        (data as any[]).map((t: any) => ({ ...t, signup_count: countMap[t.id] || 0 }))
      );
    };
    fetchData();
  }, [currentUserId, followedClubIds]);

  // Score tasks for "Aanbevolen voor jou"
  useEffect(() => {
    if (!prefs || !tasks.length) { setRecommendedTasks([]); return; }
    const signedUpIds = new Set(signups.map(s => s.task_id));
    const tasksArr = tasks as any[];
    const clubsWorkedFor = new Set(
      signups.map(s => tasksArr.find(t => t.id === s.task_id)?.club_id).filter(Boolean)
    );
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const categories: string[] = (prefs as any).categories || [];
    const timePrefs: string[] = (prefs as any).time_prefs || [];
    const categoryKeywords: Record<string, string[]> = {
      steward: ['steward'],
      bar_catering: ['bar', 'catering', 'drank', 'horeca'],
      terrain_material: ['terrain', 'material', 'veld', 'materiaal'],
      admin_ticketing: ['admin', 'ticketing', 'kassa'],
      event_support: ['event', 'evenement', 'support'],
      cleaning: ['cleaning', 'schoonmaak'],
    };
    const scored = tasksArr
      .filter(t => !signedUpIds.has(t.id) && t.task_date && new Date(t.task_date) >= now)
      .map(t => {
        let score = 0;
        const reasons: string[] = [];
        for (const cat of categories) {
          const keywords = categoryKeywords[cat] || [cat];
          if (keywords.some((kw: string) => t.title.toLowerCase().includes(kw))) {
            score += 30;
            if (!reasons.includes('category')) reasons.push('category');
          }
        }
        if (followedClubIds?.has(t.club_id)) { score += 50; reasons.push('followed'); }
        const startTime = (t as any).start_time || t.task_date;
        if (timePrefs.length > 0 && startTime) {
          const dt = new Date(startTime);
          const hours = dt.getHours();
          const dow = dt.getDay();
          if (
            (timePrefs.includes('ochtend') && hours >= 6 && hours < 12) ||
            (timePrefs.includes('middag') && hours >= 12 && hours < 17) ||
            (timePrefs.includes('avond') && hours >= 17 && hours < 23) ||
            (timePrefs.includes('weekend') && (dow === 0 || dow === 6))
          ) { score += 20; reasons.push('time'); }
        }
        if (clubsWorkedFor.has(t.club_id)) { score += 15; reasons.push('experience'); }
        if (t.task_date && new Date(t.task_date) <= in7Days) { score += 10; reasons.push('soon'); }
        return { task: t as VolunteerTask, score, reasons };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setRecommendedTasks(scored);
  }, [prefs, tasks, signups, followedClubIds]);

  const totalEarned = myPayments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0)
    + sepaPayouts.filter(s => s.batch_status === 'downloaded' && !s.error_flag).reduce((s, p) => s + p.amount, 0);

  const now = new Date();
  const myUpcomingTasks = tasks
    .filter(t => {
      const status = getSignupStatus(t.id);
      if (status !== 'assigned' && status !== 'pending') return false;
      if (t.task_date && new Date(t.task_date) < now) return false;
      return true;
    })
    .sort((a, b) => {
      const da = a.task_date ? new Date(a.task_date).getTime() : Infinity;
      const db = b.task_date ? new Date(b.task_date).getTime() : Infinity;
      return da - db;
    })
    .slice(0, 3);

  // Action required items
  const actionItems: { id: string; type: string; title: string; subtitle?: string; action: () => void; actionLabel: string }[] = [];
  myContracts.filter(c => c.status === 'pending' && c.signing_url).forEach(c => {
    actionItems.push({
      id: `contract-${c.id}`, type: 'contract',
      title: language === 'nl' ? 'Contract ondertekenen' : language === 'fr' ? 'Signer le contrat' : 'Sign contract',
      subtitle: c.task_title ? `${c.task_title}${c.club_name ? ` · ${c.club_name}` : ''}` : c.club_name,
      action: () => window.open(c.signing_url!, '_blank'),
      actionLabel: language === 'nl' ? 'Ondertekenen' : language === 'fr' ? 'Signer' : 'Sign',
    });
  });
  upcomingBriefings.forEach(b => {
    actionItems.push({
      id: `briefing-${b.taskId}`, type: 'briefing',
      title: language === 'nl' ? 'Briefing lezen' : language === 'fr' ? 'Lire le briefing' : 'Read briefing',
      subtitle: b.taskTitle,
      action: () => navigate(`/task/${b.taskId}`),
      actionLabel: language === 'nl' ? 'Bekijken' : language === 'fr' ? 'Voir' : 'View',
    });
  });
  requiredTrainings.forEach(tr => {
    actionItems.push({
      id: `training-${tr.id}`, type: 'training',
      title: language === 'nl' ? 'Verplichte training' : language === 'fr' ? 'Formation obligatoire' : 'Required training',
      subtitle: `${tr.title} · ${tr.clubName}`,
      action: () => navigate('/academy'),
      actionLabel: language === 'nl' ? 'Bekijk' : language === 'fr' ? 'Voir' : 'View',
    });
  });

  const [showAllActions, setShowAllActions] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const visibleActions = showAllActions ? actionItems : actionItems.slice(0, 3);

  // Legacy activity items for VolunteerActivitiesSection
  const activityItemsTyped = actionItems.map(a => ({
    ...a, type: a.type as 'contract' | 'briefing' | 'training' | 'partner_invite', urgent: a.type === 'contract',
  }));

  // Loyalty points (from enrollments)
  const loyaltyPoints = Object.values(loyaltyEnrollments).reduce((sum, e) => sum + (e?.points_earned || 0), 0);

  // Today's date formatted
  const todayFormatted = new Date().toLocaleDateString(
    language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  // Today's assigned events for chat
  const todayAssignedEvents = events.filter(e =>
    tasks.some(t => t.event_id === e.id && signups.some(s => s.task_id === t.id && s.status === 'assigned'))
  ).slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ═══ SECTION 1 — HERO ZONE ═══ */}

      {/* Safety alert banner */}
      {activeSafetyAlert && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors"
          onClick={() => setSafetySheetOpen(true)}>
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
          <p className="text-base font-semibold text-destructive flex-1">
            {language === 'nl' ? '⚠️ Er is een veiligheidsmelding voor jouw evenement vandaag.' :
             language === 'fr' ? '⚠️ Il y a un signalement de sécurité pour votre événement aujourd\'hui.' :
             '⚠️ There is a safety alert for your event today.'}
          </p>
          <Shield className="w-4 h-4 text-destructive shrink-0" />
        </motion.div>
      )}

      {/* Welcome + date */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/0 border border-primary/10 p-5">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
          {dt.welcome}, {profile?.full_name || profile?.email || ''}! 👋
        </h1>
        <p className="text-base text-muted-foreground mt-2 capitalize">{todayFormatted}</p>
      </motion.div>

      {/* Today & Tomorrow planning */}
      <TodayPlanningSection
        language={language}
        currentUserId={currentUserId}
        profileName={profile?.full_name || profile?.email || ''}
        tasks={tasks}
        signups={signups}
        getSignupStatus={getSignupStatus}
        zoneAssignments={zoneAssignments}
      />

      {/* Onboarding Wizard */}
      {currentUserId && followedClubIds && followedClubIds.size > 0 && (
        <OnboardingWizard
          userId={currentUserId} clubId={[...followedClubIds][0]} language={language}
          hasProfile={!!(profile?.full_name && profile?.avatar_url)}
          hasContract={myContracts.some(c => c.status === 'completed')}
          hasTraining={myCertifiedTrainingIds.size > 0}
          hasTask={signups.some(s => s.status === 'assigned')}
          onStepAction={(step) => {
            if (step === 'profile_complete') setShowProfileDialog(true);
            else if (step === 'contract_signed') setActiveTab('contracts');
            else if (step === 'training_done') window.open('/volunteer-training', '_self');
            else if (step === 'first_task') setActiveTab('mine');
          }}
        />
      )}

      {/* ═══ SECTION 2 — STATS STRIP ═══ */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-accent" />
          </div>
          <p className="text-2xl font-heading font-bold text-foreground leading-none">{assignedSignups.length}</p>
          <p className="text-xs text-muted-foreground leading-tight">{dt.tasksCompleted}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-heading font-bold text-foreground leading-none">€{totalEarned.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground leading-tight">{dt.totalEarned}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-secondary-foreground" />
          </div>
          <p className="text-2xl font-heading font-bold text-foreground leading-none">{loyaltyPoints}</p>
          <p className="text-xs text-muted-foreground leading-tight">{language === 'nl' ? 'Punten' : 'Points'}</p>
        </motion.div>
      </div>

      {/* ═══ TAKEN VAN JOUW CLUBS ═══ */}
      {followedClubIds && followedClubIds.size > 0 && (() => {
        const filtered = followedClubTasksRaw
          .filter(t => !signups.some(s => s.task_id === t.id))
          .slice(0, 5);
        if (filtered.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-amber-200/60 dark:border-amber-800/40 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-amber-500" />
                {language === 'nl' ? 'Taken van jouw clubs' : language === 'fr' ? 'Tâches de vos clubs' : 'Tasks from your clubs'}
              </h3>
              <button
                onClick={() => setActiveTab('club-tasks')}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                {language === 'nl' ? 'Bekijk alle' : language === 'fr' ? 'Voir tout' : 'View all'} →
              </button>
            </div>
            <div className="space-y-3">
              {filtered.map((task, i) => {
                const freeSpots = task.spots_available - task.signup_count;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30"
                  >
                    <Avatar className="h-11 w-11 shrink-0 rounded-xl">
                      {task.clubs?.logo_url && <AvatarImage src={task.clubs.logo_url} alt={task.clubs?.name || ''} />}
                      <AvatarFallback className="rounded-xl text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        {(task.clubs?.name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
                          <Heart className="w-2.5 h-2.5" />
                          {language === 'nl' ? 'Jouw club' : language === 'fr' ? 'Ton club' : 'Your club'}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-foreground truncate">{task.title}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                        {task.clubs?.name && <span>{task.clubs.name}</span>}
                        {task.task_date && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.task_date).toLocaleDateString(
                              language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                              { weekday: 'short', day: 'numeric', month: 'short' }
                            )}
                          </span>
                        )}
                        {task.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3.5 h-3.5" />{task.location}
                          </span>
                        )}
                        <span className="font-medium text-foreground">
                          {freeSpots > 0
                            ? `${freeSpots} ${language === 'nl' ? 'plaatsen vrij' : language === 'fr' ? 'places libres' : 'spots left'}`
                            : (language === 'nl' ? 'Volzet' : language === 'fr' ? 'Complet' : 'Full')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/task/${task.id}`)}
                      disabled={freeSpots <= 0}
                      className="shrink-0 h-12 px-4 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      {language === 'nl' ? 'Inschrijven' : language === 'fr' ? "S'inscrire" : 'Sign up'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
            <button
              onClick={() => setActiveTab('club-tasks')}
              className="mt-4 w-full h-12 rounded-xl border border-border text-sm font-semibold text-primary hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
            >
              {language === 'nl' ? 'Bekijk alle taken van deze clubs' : language === 'fr' ? 'Voir toutes les tâches de ces clubs' : 'View all tasks from your clubs'} →
            </button>
          </motion.div>
        );
      })()}

      {/* ═══ TASK SEARCH ═══ */}
      {(() => {
        const sports = [...new Set(tasks.map(t => t.clubs?.sport).filter(Boolean))] as string[];
        const isSearching = taskSearch.trim().length > 0 || sportFilter;
        const filtered = isSearching
          ? tasks.filter(t => {
              const signupStatus = getSignupStatus(t.id);
              if (signupStatus) return false; // already signed up
              const matchesText = !taskSearch.trim() || t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.clubs?.name?.toLowerCase().includes(taskSearch.toLowerCase());
              const matchesSport = !sportFilter || t.clubs?.sport === sportFilter;
              return matchesText && matchesSport;
            }).slice(0, 5)
          : [];
        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-primary" />
              {language === 'nl' ? 'Taken zoeken' : language === 'fr' ? 'Chercher des tâches' : 'Search tasks'}
            </h3>

            {/* Aanbevolen voor jou */}
            {prefs && recommendedTasks.length > 0 && (
              <div className="mb-4">
                <p className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {language === 'nl' ? 'Aanbevolen voor jou' : language === 'fr' ? 'Recommandé pour vous' : 'Recommended for you'}
                </p>
                <div className="space-y-2">
                  {recommendedTasks.map((scored) => (
                    <div
                      key={scored.task.id}
                      onClick={() => navigate(`/task/${scored.task.id}`)}
                      className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 cursor-pointer transition-colors min-h-[64px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground truncate">{scored.task.title}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {scored.reasons.includes('followed') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              <Heart className="w-3 h-3" />
                              {language === 'nl' ? 'Jouw club' : language === 'fr' ? 'Ton club' : 'Your club'}
                            </span>
                          )}
                          {scored.reasons.includes('category') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {language === 'nl' ? 'Jouw categorie' : language === 'fr' ? 'Ta catégorie' : 'Your category'}
                            </span>
                          )}
                          {scored.reasons.includes('time') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary-foreground">
                              <Clock className="w-3 h-3" />
                              {language === 'nl' ? 'Jouw tijdstip' : language === 'fr' ? 'Ton créneau' : 'Your time'}
                            </span>
                          )}
                          {scored.reasons.includes('experience') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                              {language === 'nl' ? 'Ervaring' : language === 'fr' ? 'Expérience' : 'Experience'}
                            </span>
                          )}
                          {scored.reasons.includes('soon') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-700 dark:text-orange-400">
                              {language === 'nl' ? 'Binnenkort' : language === 'fr' ? 'Bientôt' : 'Coming up'}
                            </span>
                          )}
                        </div>
                        {(scored.task as any).task_date && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date((scored.task as any).task_date).toLocaleDateString(
                              language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                              { weekday: 'short', day: 'numeric', month: 'short' }
                            )}
                            {(scored.task as any).clubs?.name && ` · ${(scored.task as any).clubs.name}`}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                placeholder={language === 'nl' ? 'Zoek taken bij clubs...' : language === 'fr' ? 'Chercher des tâches...' : 'Search tasks...'}
                className="w-full h-12 rounded-xl border border-border bg-muted/30 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            {sports.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                {sports.map(sport => (
                  <button key={sport} onClick={() => setSportFilter(prev => prev === sport ? null : sport)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sportFilter === sport
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}>
                    {sport}
                  </button>
                ))}
              </div>
            )}
            {isSearching && filtered.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {filtered.map(task => (
                  <div key={task.id} onClick={() => navigate(`/task/${task.id}`)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors min-h-[60px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground truncate">{task.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        {task.clubs?.name && <span>{task.clubs.name}</span>}
                        {task.task_date && <span>· {new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
            {isSearching && filtered.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground text-center py-2">
                {language === 'nl' ? 'Geen taken gevonden.' : language === 'fr' ? 'Aucune tâche trouvée.' : 'No tasks found.'}
              </p>
            )}
            <button onClick={() => navigate('/community')}
              className="mt-4 w-full h-12 rounded-xl border border-border text-sm font-semibold text-primary hover:bg-muted/30 transition-colors flex items-center justify-center gap-2">
              {language === 'nl' ? 'Alle taken bekijken' : language === 'fr' ? 'Voir toutes les tâches' : 'View all tasks'} →
            </button>
          </motion.div>
        );
      })()}

      {/* ═══ SECTION 3 — ACTIE VEREIST ═══ */}
      {actionItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {language === 'nl' ? 'Actie vereist' : language === 'fr' ? 'Action requise' : 'Action required'}
            <span className="ml-auto text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">{actionItems.length}</span>
          </h3>
          <div className="space-y-2">
            {visibleActions.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'contract' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    item.type === 'briefing' ? 'bg-primary/10' :
                    item.type === 'training' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-accent/10'
                  }`}>
                    {item.type === 'contract' ? <FileSignature className="w-5 h-5 text-orange-600 dark:text-orange-400" /> :
                     item.type === 'briefing' ? <FileText className="w-5 h-5 text-primary" /> :
                     item.type === 'training' ? <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" /> :
                     <BookOpen className="w-5 h-5 text-accent-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{item.title}</p>
                    {item.subtitle && <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>}
                  </div>
                </div>
                <button onClick={item.action}
                  className="shrink-0 h-12 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
          {actionItems.length > 3 && !showAllActions && (
            <button onClick={() => setShowAllActions(true)}
              className="mt-4 text-sm font-medium text-primary hover:underline flex items-center gap-1.5">
              {language === 'nl' ? `Toon alles (${actionItems.length})` : language === 'fr' ? `Tout afficher (${actionItems.length})` : `Show all (${actionItems.length})`}
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}

      {/* ═══ SECTION 4 — KOMENDE TAKEN ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-heading font-bold text-foreground">{dt.upcomingTasks}</h2>
          <button onClick={() => setActiveTab('mine')} className="text-xs font-medium text-primary hover:underline">{dt.viewAll} →</button>
        </div>
        {myUpcomingTasks.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-base text-muted-foreground">{dt.noMyTasks}</p>
            <button onClick={() => setActiveTab('mine')} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              {dt.allTasks} →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myUpcomingTasks.map((task, i) => {
              const signupStatus = getSignupStatus(task.id);
              const isAssigned = signupStatus === 'assigned';
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/task/${task.id}`)}
                  className={`bg-card rounded-2xl p-5 shadow-sm border cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${isAssigned ? 'border-l-4 border-l-accent border-t-border border-r-border border-b-border' : 'border-border'}`}>
                  <Avatar className="h-12 w-12 shrink-0 rounded-xl">
                    <AvatarFallback className="rounded-xl text-sm font-bold bg-secondary/10 text-secondary">
                      {(task.clubs?.name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{task.title}</p>
                    {zoneAssignments[task.id] && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent-foreground w-fit">
                        <Layers className="w-3.5 h-3.5" />
                        {language === 'fr' ? 'Zone :' : 'Zone:'} {zoneAssignments[task.id]}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                      {task.clubs?.name && <span>{task.clubs.name}</span>}
                      {task.task_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {(task.location || task.clubs?.location) && (
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location || task.clubs?.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isAssigned ? (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-accent/15 text-accent-foreground flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />{dt.assigned}</span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{dt.pending}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ SECTION 5 — MEER DETAILS NAVIGATIEKAART ═══ */}
      <button
        onClick={() => navigate('/volunteer-details')}
        className="w-full bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-primary/40 transition-all group text-left min-h-[72px]"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <LayoutList className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground">
            {language === 'nl' ? 'Mijn Details & Voorkeuren' : language === 'fr' ? 'Mes Détails & Préférences' : 'My Details & Preferences'}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === 'nl' ? 'Seizoen, vergoedingen, badges, skills en meer' : language === 'fr' ? 'Saison, paiements, badges, compétences et plus' : 'Season, payments, badges, skills and more'}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>

      {/* ═══ SECTION 6 — ACTIVITEITEN & COMPLIANCE ═══ */}
      <VolunteerActivitiesSection items={activityItemsTyped} language={language} />
      {complianceData && <ComplianceBadge compliance={complianceData} language={language} />}

      {/* Safety Sheet */}
      <Sheet open={safetySheetOpen} onOpenChange={setSafetySheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              {language === 'nl' ? 'Veiligheidscontrole' : language === 'fr' ? 'Contrôle de sécurité' : 'Safety check'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Suspense fallback={<div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              <VolunteerSafetyTab userId={currentUserId} language={language} />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default VolunteerDashboardHome;
