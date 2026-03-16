import { useEffect, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, CheckCircle, ClipboardList, TrendingUp, FileText, AlertTriangle, BookOpen, Layers, ChevronDown, Sparkles, FileSignature, Wallet } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import OnboardingWizard from '@/components/OnboardingWizard';
import VolunteerActivitiesSection from '@/components/VolunteerActivitiesSection';
import ComplianceBadge from '@/components/ComplianceBadge';
import VolunteerSeasonOverview from '@/components/VolunteerSeasonOverview';
import VolunteerFinancialDashboard from '@/components/VolunteerFinancialDashboard';
import VolunteerBadges from '@/components/VolunteerBadges';
import SkillsPassport from '@/components/SkillsPassport';
import MicroLearningsSection from '@/components/MicroLearningsSection';
import CalendarSyncSection from '@/components/CalendarSyncSection';
import ReferralSection from '@/components/ReferralSection';
import NearbyClubsWidget from '@/components/community/NearbyClubsWidget';
import VolunteerTaskPreferences from '@/components/VolunteerTaskPreferences';
import EventGroupChat from '@/components/EventGroupChat';
import TodayPlanningSection from '@/components/volunteer/TodayPlanningSection';
import VolunteerLoyaltyProgress from '@/components/volunteer/VolunteerLoyaltyProgress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Shield } from 'lucide-react';
const VolunteerSafetyTab = lazy(() => import('@/components/VolunteerSafetyTab'));
import type { VolunteerTask, TaskSignup, VolunteerPayment, SignatureContract, SepaPayoutItem, VolunteerEventData } from '@/types/volunteer';
import { volunteerDashboardLabels } from '@/types/volunteer';

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
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: string) => void;
  setShowProfileDialog: (v: boolean) => void;
  getSignupStatus: (taskId: string) => string | null;
}

const VolunteerDashboardHome = ({
  language, currentUserId, profile, followedClubIds, myContracts, myCertifiedTrainingIds,
  signups, tasks, events, myPayments, sepaPayouts, pendingSignups, assignedSignups,
  complianceData, searchQuery, setSearchQuery, setActiveTab, setShowProfileDialog, getSignupStatus,
}: Props) => {
  const navigate = useNavigate();
  const dt = volunteerDashboardLabels[language as keyof typeof volunteerDashboardLabels] || volunteerDashboardLabels.nl;
  const [upcomingBriefings, setUpcomingBriefings] = useState<{ taskId: string; taskTitle: string; taskDate: string }[]>([]);
  const [activeSafetyAlert, setActiveSafetyAlert] = useState(false);
  const [safetySheetOpen, setSafetySheetOpen] = useState(false);
  const [requiredTrainings, setRequiredTrainings] = useState<{ id: string; title: string; clubName: string }[]>([]);
  const [zoneAssignments, setZoneAssignments] = useState<Record<string, string>>({});
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
      title: language === 'nl' ? 'Training vereist' : language === 'fr' ? 'Formation requise' : 'Training required',
      subtitle: `${tr.title} · ${tr.clubName}`,
      action: () => navigate(`/training/${tr.id}`),
      actionLabel: language === 'nl' ? 'Start' : language === 'fr' ? 'Démarrer' : 'Start',
    });
  });

  const [showAllActions, setShowAllActions] = useState(false);
  const visibleActions = showAllActions ? actionItems : actionItems.slice(0, 3);

  // Legacy activity items for VolunteerActivitiesSection
  const activityItemsTyped = actionItems.map(a => ({
    ...a, type: a.type as 'contract' | 'briefing' | 'training' | 'partner_invite', urgent: a.type === 'contract',
  }));

  // Loyalty points (from sepa + payments)
  const loyaltyPoints = sepaPayouts.filter(s => !s.error_flag).reduce((sum, s) => sum + Math.floor(s.amount), 0);

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
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ═══ SECTION 1 — HERO ZONE ═══ */}

      {/* Safety alert banner */}
      {activeSafetyAlert && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors"
          onClick={() => setSafetySheetOpen(true)}>
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm font-medium text-destructive flex-1">
            {language === 'nl' ? '⚠️ Er is een veiligheidsmelding voor jouw evenement vandaag.' :
             language === 'fr' ? '⚠️ Il y a un signalement de sécurité pour votre événement aujourd\'hui.' :
             '⚠️ There is a safety alert for your event today.'}
          </p>
          <Shield className="w-4 h-4 text-destructive shrink-0" />
        </motion.div>
      )}

      {/* Welcome + date */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          {dt.welcome}, {profile?.full_name || profile?.email || ''}! 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{todayFormatted}</p>
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
          className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center">
          <div className="w-8 h-8 mx-auto rounded-xl bg-accent/10 flex items-center justify-center mb-1.5">
            <CheckCircle className="w-4 h-4 text-accent" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">{assignedSignups.length}</p>
          <p className="text-[11px] text-muted-foreground">{dt.tasksCompleted}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center">
          <div className="w-8 h-8 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-1.5">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">€{totalEarned.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground">{dt.totalEarned}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center">
          <div className="w-8 h-8 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-1.5">
            <Sparkles className="w-4 h-4 text-secondary-foreground" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">{loyaltyPoints}</p>
          <p className="text-[11px] text-muted-foreground">{language === 'nl' ? 'Punten' : 'Points'}</p>
        </motion.div>
      </div>

      {/* ═══ SECTION 3 — ACTIE VEREIST ═══ */}
      {actionItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-primary" />
            {language === 'nl' ? 'Actie vereist' : language === 'fr' ? 'Action requise' : 'Action required'}
            <span className="ml-auto text-[10px] font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10 text-primary">{actionItems.length}</span>
          </h3>
          <div className="space-y-2">
            {visibleActions.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'contract' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    item.type === 'briefing' ? 'bg-primary/10' : 'bg-accent/10'
                  }`}>
                    {item.type === 'contract' ? <FileSignature className="w-4 h-4 text-orange-600 dark:text-orange-400" /> :
                     item.type === 'briefing' ? <FileText className="w-4 h-4 text-primary" /> :
                     <BookOpen className="w-4 h-4 text-accent-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                  </div>
                </div>
                <button onClick={item.action}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
          {actionItems.length > 3 && !showAllActions && (
            <button onClick={() => setShowAllActions(true)}
              className="mt-3 text-xs font-medium text-primary hover:underline flex items-center gap-1">
              {language === 'nl' ? `Toon alles (${actionItems.length})` : language === 'fr' ? `Tout afficher (${actionItems.length})` : `Show all (${actionItems.length})`}
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}

      {/* ═══ SECTION 4 — KOMENDE TAKEN ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-semibold text-foreground">{dt.upcomingTasks}</h2>
          <button onClick={() => setActiveTab('mine')} className="text-xs font-medium text-primary hover:underline">{dt.viewAll} →</button>
        </div>
        {myUpcomingTasks.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{dt.noMyTasks}</p>
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
                  className={`bg-card rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${isAssigned ? 'border-accent/30' : 'border-border'}`}>
                  <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                    <AvatarFallback className="rounded-xl text-xs font-bold bg-secondary/10 text-secondary">
                      {(task.clubs?.name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                    {zoneAssignments[task.id] && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent-foreground w-fit">
                        <Layers className="w-3 h-3" />
                        {language === 'fr' ? 'Zone :' : 'Zone:'} {zoneAssignments[task.id]}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
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
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent-foreground flex items-center gap-1"><CheckCircle className="w-3 h-3" />{dt.assigned}</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">{dt.pending}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ SECTION 5 — MEER OVER MIJN SEIZOEN (accordion) ═══ */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-3">
          {language === 'nl' ? 'Meer details' : language === 'fr' ? 'Plus de détails' : 'More details'}
        </h2>
        <Accordion type="multiple" className="space-y-2">
          <AccordionItem value="season" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Mijn Seizoen' : language === 'fr' ? 'Ma Saison' : 'My Season'}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {currentUserId && <VolunteerSeasonOverview userId={currentUserId} language={language} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="financials" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Vergoedingen' : language === 'fr' ? 'Remboursements' : 'Payments'}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {currentUserId && <VolunteerFinancialDashboard userId={currentUserId} language={language} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="badges" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Badges & Loyaliteit' : language === 'fr' ? 'Badges & Fidélité' : 'Badges & Loyalty'}
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {currentUserId && <VolunteerLoyaltyProgress userId={currentUserId} language={language} totalPoints={loyaltyPoints} />}
              {currentUserId && <VolunteerBadges userId={currentUserId} language={language} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="skills" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Skills & Academy' : language === 'fr' ? 'Compétences & Académie' : 'Skills & Academy'}
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {currentUserId && <SkillsPassport userId={currentUserId} language={language} />}
              {currentUserId && <MicroLearningsSection userId={currentUserId} language={language} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="clubs" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Clubs in de buurt' : language === 'fr' ? 'Clubs à proximité' : 'Nearby clubs'}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <NearbyClubsWidget userId={currentUserId} language={language} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="calendar" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Kalender sync' : language === 'fr' ? 'Sync calendrier' : 'Calendar sync'}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {currentUserId && <CalendarSyncSection userId={currentUserId} language={language} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="referral" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Vrienden werven' : language === 'fr' ? 'Parrainer des amis' : 'Refer friends'}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {currentUserId && <ReferralSection userId={currentUserId} language={language} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preferences" className="bg-card rounded-2xl border border-border shadow-sm px-5 data-[state=open]:shadow-md transition-shadow">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {language === 'nl' ? 'Taakaanbevelingen' : language === 'fr' ? 'Recommandations' : 'Task recommendations'}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {currentUserId && (
                <VolunteerTaskPreferences userId={currentUserId} language={language} tasks={tasks}
                  signedUpTaskIds={new Set(signups.map(s => s.task_id))} onNavigateToTask={(taskId) => navigate(`/task/${taskId}`)} />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* ═══ SECTION 6 — ACTIVITEITEN & COMPLIANCE ═══ */}
      <VolunteerActivitiesSection items={activityItemsTyped} language={language} />
      {complianceData && <ComplianceBadge compliance={complianceData} language={language} />}
      {currentUserId && todayAssignedEvents.map(event => (
        <EventGroupChat key={event.id} eventId={event.id} eventTitle={event.title} userId={currentUserId} language={language} />
      ))}

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
