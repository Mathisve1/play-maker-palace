import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/posthog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { VolunteerCardsSkeleton } from '@/components/dashboard/DashboardSkeleton';
import EditProfileDialog from '@/components/EditProfileDialog';
import { VolunteerBriefingsList } from '@/components/VolunteerBriefingView';
import MonthlyComplianceDialog from '@/components/MonthlyComplianceDialog';
import { useComplianceData } from '@/hooks/useComplianceData';
import EventDetailDialog from '@/components/EventDetailDialog';
import DashboardLayout from '@/components/DashboardLayout';
import VolunteerSidebar, { VolunteerTab } from '@/components/VolunteerSidebar';
import VolunteerMonthlyTab from '@/components/VolunteerMonthlyTab';
import VolunteerContractsTab from '@/components/volunteer/VolunteerContractsTab';
import VolunteerPaymentsTab from '@/components/volunteer/VolunteerPaymentsTab';
import VolunteerDashboardHome from '@/components/volunteer/VolunteerDashboardHome';
import VolunteerClubTasksBrowser from '@/components/volunteer/VolunteerClubTasksBrowser';
import VolunteerTasksList from '@/components/volunteer/VolunteerTasksList';
import VolunteerGrowTab from '@/components/volunteer/VolunteerGrowTab';
import VolunteerTicketsTab from '@/components/volunteer/VolunteerTicketsTab';
import VolunteerOnboardingWizard from '@/components/VolunteerOnboardingWizard';
import VolunteerOnboardingTour from '@/components/VolunteerOnboardingTour';
import TaskReviewDialog from '@/components/TaskReviewDialog';
import { Star, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
interface Task {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  status: string;
  club_id: string;
  created_at: string;
  expense_reimbursement?: boolean;
  expense_amount?: number | null;
  briefing_time?: string | null;
  briefing_location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  required_training_id?: string | null;
  clubs?: { name: string; sport: string | null; location: string | null; logo_url?: string | null };
  event_id?: string | null;
  event_group_id?: string | null;
}

interface TaskSignup {
  task_id: string;
  status: string;
}

interface VolunteerPayment {
  id: string;
  task_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  
  task_title?: string;
  club_name?: string;
}

interface SignatureContract {
  id: string;
  task_id: string;
  status: string;
  signing_url: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  task_title?: string;
  club_name?: string;
}

interface VolunteerTicket {
  id: string;
  task_id: string | null;
  event_id: string | null;
  club_id: string;
  status: string;
  ticket_url: string | null;
  barcode: string | null;
  external_ticket_id: string | null;
  created_at: string;
  checked_in_at: string | null;
  task_title?: string;
  club_name?: string;
  event_title?: string;
}

interface SepaPayoutItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  error_flag: boolean;
  error_message: string | null;
  batch_status: string;
  batch_reference: string;
  task_title?: string;
  club_name?: string;
}

interface EventData {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  club_name?: string;
}

interface EventGroup {
  id: string;
  event_id: string;
  name: string;
  color: string;
  sort_order: number;
}

const VolunteerDashboard = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [signups, setSignups] = useState<TaskSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<VolunteerTab>(() => {
    const urlTab = searchParams.get('tab');
    const validTabs: VolunteerTab[] = ['dashboard', 'mine', 'monthly', 'contracts', 'payments', 'grow', 'tickets' as VolunteerTab, 'profile' as VolunteerTab, 'club-tasks' as VolunteerTab];
    if (urlTab && validTabs.includes(urlTab as VolunteerTab)) return urlTab as VolunteerTab;
    return 'dashboard';
  });
  
  const [_signingContract, _setSigningContract] = useState<string | null>(null);
  const [myPayments, setMyPayments] = useState<VolunteerPayment[]>([]);
  const [myContracts, setMyContracts] = useState<SignatureContract[]>([]);
  const [checkingContract, setCheckingContract] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<VolunteerTicket[]>([]);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [sepaPayouts, setSepaPayouts] = useState<SepaPayoutItem[]>([]);
  
  const [safetyAlertActive, setSafetyAlertActive] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<{ taskSignupId: string; taskTitle: string; clubName: string; clubOwnerId: string }[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ taskSignupId: string; taskTitle: string; revieweeId: string } | null>(null);
  const [showVolunteerOnboarding, setShowVolunteerOnboarding] = useState(false);
  const [volunteerOnboardingContract, setVolunteerOnboardingContract] = useState<{ id: string; signing_url: string | null; status: string } | null>(null);
  const [showVolunteerTour, setShowVolunteerTour] = useState(false);

  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [myCertifiedTrainingIds, setMyCertifiedTrainingIds] = useState<Set<string>>(new Set());
  const [followedClubIds, setFollowedClubIds] = useState<Set<string> | null>(null);

  const [events, setEvents] = useState<EventData[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  const [loyaltyPrograms, setLoyaltyPrograms] = useState<{ id: string; name: string; description: string | null; reward_description: string; required_tasks: number; required_points: number | null; points_based: boolean; club_id: string; club_name?: string }[]>([]);
  const [loyaltyEnrollments, setLoyaltyEnrollments] = useState<Record<string, { id: string; tasks_completed: number; points_earned: number; reward_claimed: boolean }>>({});
  const [enrollingProgram, setEnrollingProgram] = useState<string | null>(null);
  const [badgeRefreshKey, setBadgeRefreshKey] = useState(0);

  // Sync tab from URL search params
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'profile') {
      setShowProfileDialog(true);
      setActiveTab('dashboard');
    } else if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab as VolunteerTab);
    } else if (!urlTab && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  const { data: complianceData } = useComplianceData(currentUserId || null);

  // ===== Use ClubContext instead of re-fetching auth/profile =====
  const { userId: contextUserId2, profile: contextProfile, clubId: contextClubId, clubInfo: contextClubInfo } = useClubContext();
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url?: string | null } | null>(null);

  // Sync profile from context on mount
  useEffect(() => {
    if (contextProfile) {
      setProfile({ full_name: contextProfile.full_name, email: contextProfile.email, avatar_url: contextProfile.avatar_url });
    }
  }, [contextProfile]);

  // Realtime listener for spoed_oproep notifications
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`spoed-oproep-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`,
      }, (payload: any) => {
        if (payload.new?.type === 'spoed_oproep') {
          const taskId = payload.new?.metadata?.task_id;
          const bonusText = payload.new?.metadata?.bonus_amount
            ? ` (+€${payload.new.metadata.bonus_amount} bonus!)`
            : '';
          toast.warning(payload.new.title + bonusText, {
            description: payload.new.message,
            duration: 10000,
            action: taskId ? {
              label: language === 'nl' ? 'Bekijk taak' : language === 'fr' ? 'Voir tâche' : 'View task',
              onClick: () => navigate(`/task/${taskId}`),
            } : undefined,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, language, navigate]);

  useEffect(() => {
    const init = async () => {
      // Use contextUserId directly — don't wait for ClubContext to fully load
      const uid = contextUserId2 || '';
      if (!uid) return;
      setCurrentUserId(uid);

      // ===== CRITICAL PATH: Tasks + signups (show UI fast) =====
      const [tasksRes, signupsRes] = await Promise.all([
        supabase.from('tasks').select('*, clubs(name, sport, location)').eq('status', 'open').order('task_date', { ascending: true }),
        (supabase as any).from('task_signups').select('task_id, status, checked_in_at').eq('volunteer_id', uid),
      ]);

      // Process tasks immediately so UI renders
      if (!tasksRes.error && tasksRes.data) {
        setTasks(tasksRes.data);
        setSignups(signupsRes.data || []);
        setLoading(false); // ← UI visible NOW
      }

      // Check first login from context profile
      if (contextProfile && !contextProfile.full_name) {
        setIsFirstLogin(true);
        setShowProfileDialog(true);
      }

      // ===== DEFERRED PATH: Everything else loads in background =====
      const [
        eventsRes, paymentsRes, sepaRes, contractsRes, ticketsRes,
        loyaltyRes, certsRes, followsRes,
      ] = await Promise.all([
        supabase.from('events').select('*').is('training_id', null).neq('event_type', 'training').neq('status', 'on_hold').order('event_date', { ascending: true }),
        supabase.from('volunteer_payments').select('id, task_id, amount, currency, status, paid_at, created_at').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('sepa_batch_items').select('id, amount, status, created_at, error_flag, error_message, batch_id, task_id, volunteer_id').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('signature_requests').select('id, task_id, status, signing_url, document_url, created_at, updated_at').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('volunteer_tickets').select('id, task_id, event_id, club_id, status, ticket_url, barcode, external_ticket_id, created_at, checked_in_at').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('loyalty_programs').select('*').eq('is_active', true),
        supabase.from('volunteer_certificates').select('training_id').eq('volunteer_id', uid),
        supabase.from('club_follows').select('club_id').eq('user_id', uid),
      ]);

      // ===== Task enrichment (only if we have tasks) =====
      const enrichedTasks = tasksRes.data || [];
      if (enrichedTasks.length > 0) {
        const taskIds = enrichedTasks.map(t => t.id);
        const [taskExtrasRes, signupCountRes, likeCountRes, myLikeRes, trainingEventsRes] = await Promise.all([
          supabase.from('tasks').select('id, event_id, event_group_id').in('id', taskIds),
          supabase.from('task_signups').select('task_id').in('task_id', taskIds),
          supabase.from('task_likes').select('task_id').in('task_id', taskIds),
          supabase.from('task_likes').select('task_id').eq('user_id', uid),
          supabase.from('events').select('id').eq('event_type', 'training'),
        ]);

        const extraMap = new Map((taskExtrasRes.data || []).map((t: any) => [t.id, t]));
        let finalTasks = enrichedTasks.map(t => ({
          ...t,
          event_id: (extraMap.get(t.id) as any)?.event_id || null,
          event_group_id: (extraMap.get(t.id) as any)?.event_group_id || null,
        }));

        const trainingEventIds = new Set<string>((trainingEventsRes.data || []).map((e: any) => e.id));
        finalTasks = finalTasks.filter(t => !t.event_id || !trainingEventIds.has(t.event_id));
        setTasks(finalTasks);

        if (signupCountRes.data) {
          const counts: Record<string, number> = {};
          signupCountRes.data.forEach(s => { counts[s.task_id] = (counts[s.task_id] || 0) + 1; });
          setSignupCounts(counts);
        }
        if (likeCountRes.data) {
          const lCounts: Record<string, number> = {};
          likeCountRes.data.forEach(l => { lCounts[l.task_id] = (lCounts[l.task_id] || 0) + 1; });
          setLikeCounts(lCounts);
        }
        if (myLikeRes.data) { setMyLikes(new Set(myLikeRes.data.map(l => l.task_id))); }
      } else {
        setLoading(false);
      }

      // Process events
      const allEventsData = eventsRes.data;
      if (allEventsData && allEventsData.length > 0) {
        const clubIds = [...new Set(allEventsData.map((e: any) => e.club_id))] as string[];
        const allEventIds = allEventsData.map((e: any) => e.id);
        const [clubsRes, groupsRes] = await Promise.all([
          supabase.from('clubs').select('id, name').in('id', clubIds),
          supabase.from('event_groups').select('*').in('event_id', allEventIds).order('sort_order', { ascending: true }),
        ]);
        const clubMap = new Map(clubsRes.data?.map(c => [c.id, c.name]) || []);
        setEvents(allEventsData.map((e: any) => ({ ...e, club_name: clubMap.get(e.club_id) || '' })));
        setEventGroups(groupsRes.data || []);
      }

      setSignups(signupsRes.data || []);

      // Process payments, sepa, contracts, tickets, loyalty, certs, follows — all already fetched in parallel
      const paymentsData = paymentsRes.data;
      const sepaItems = sepaRes.data;
      const contractsData = contractsRes.data;
      const ticketsData = ticketsRes.data;
      const allPrograms = loyaltyRes.data;

      // Collect all task IDs we need to enrich in one batch
      const enrichTaskIds = new Set<string>();
      paymentsData?.forEach((p: any) => enrichTaskIds.add(p.task_id));
      sepaItems?.forEach((s: any) => enrichTaskIds.add(s.task_id));
      contractsData?.forEach((c: any) => enrichTaskIds.add(c.task_id));
      ticketsData?.filter((t: any) => t.task_id).forEach((t: any) => enrichTaskIds.add(t.task_id));

      const enrichClubIds = new Set<string>();
      ticketsData?.forEach((t: any) => enrichClubIds.add(t.club_id));
      allPrograms?.forEach((p: any) => enrichClubIds.add(p.club_id));

      const enrichEventIds = new Set<string>();
      ticketsData?.filter((t: any) => t.event_id).forEach((t: any) => enrichEventIds.add(t.event_id));

      const batchIds = new Set<string>();
      sepaItems?.forEach((s: any) => batchIds.add(s.batch_id));

      const programIds = allPrograms?.map((p: any) => p.id) || [];

      // Parallel batch 2: enrich all related data
      const [enrichTasksRes, enrichClubsRes, enrichEventsRes, batchesRes, loyaltyEnrRes] = await Promise.all([
        enrichTaskIds.size > 0
          ? supabase.from('tasks').select('id, title, club_id, clubs(name)').in('id', Array.from(enrichTaskIds))
          : Promise.resolve({ data: [] as any[] }),
        enrichClubIds.size > 0
          ? supabase.from('clubs').select('id, name').in('id', Array.from(enrichClubIds))
          : Promise.resolve({ data: [] as any[] }),
        enrichEventIds.size > 0
          ? supabase.from('events').select('id, title').in('id', Array.from(enrichEventIds))
          : Promise.resolve({ data: [] as any[] }),
        batchIds.size > 0
          ? supabase.from('sepa_batches').select('id, status, batch_reference, club_id').in('id', Array.from(batchIds))
          : Promise.resolve({ data: [] as any[] }),
        programIds.length > 0
          ? supabase.from('loyalty_enrollments').select('*').eq('volunteer_id', uid).in('program_id', programIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const taskEnrichMap = new Map((enrichTasksRes.data || []).map((t: any) => [t.id, t]));
      const clubEnrichMap = new Map((enrichClubsRes.data || []).map((c: any) => [c.id, c.name]));
      const eventEnrichMap = new Map((enrichEventsRes.data || []).map((e: any) => [e.id, e.title]));
      const batchMap = new Map((batchesRes.data || []).map((b: any) => [b.id, b]));

      // Set payments
      if (paymentsData && paymentsData.length > 0) {
        setMyPayments(paymentsData.map((p: any) => {
          const t = taskEnrichMap.get(p.task_id);
          return { ...p, task_title: t?.title, club_name: t?.clubs?.name };
        }));
      }

      // Set SEPA
      if (sepaItems && sepaItems.length > 0) {
        setSepaPayouts(sepaItems.map((item: any) => {
          const batch = batchMap.get(item.batch_id) as any;
          const task = taskEnrichMap.get(item.task_id);
          return {
            id: item.id, amount: Number(item.amount), status: item.status, created_at: item.created_at,
            error_flag: item.error_flag, error_message: item.error_message,
            batch_status: batch?.status || 'pending', batch_reference: batch?.batch_reference || '',
            task_title: task?.title, club_name: task?.clubs?.name,
          };
        }));
      }

      // Set contracts
      if (contractsData && contractsData.length > 0) {
        setMyContracts(contractsData.map((c: any) => {
          const t = taskEnrichMap.get(c.task_id);
          return { ...c, task_title: t?.title, club_name: t?.clubs?.name };
        }));
      }

      // Set tickets
      if (ticketsData && ticketsData.length > 0) {
        setMyTickets(ticketsData.map((t: any) => ({
          ...t,
          club_name: clubEnrichMap.get(t.club_id) || '',
          task_title: t.task_id ? taskEnrichMap.get(t.task_id)?.title || '' : '',
          event_title: t.event_id ? eventEnrichMap.get(t.event_id) || '' : '',
        })));
      }

      // Certs & follows
      if (certsRes.data) { setMyCertifiedTrainingIds(new Set(certsRes.data.map((c: any) => c.training_id))); }
      const userFollowedClubIds = new Set(followsRes.data?.map((f: any) => f.club_id) || []);
      setFollowedClubIds(userFollowedClubIds);

      // Set loyalty — only show programs from followed clubs
      if (allPrograms && allPrograms.length > 0) {
        const filteredPrograms = userFollowedClubIds.size > 0
          ? allPrograms.filter((p: any) => userFollowedClubIds.has(p.club_id))
          : allPrograms;
        setLoyaltyPrograms(filteredPrograms.map((p: any) => ({ ...p, club_name: clubEnrichMap.get(p.club_id) || '' })));
        if (loyaltyEnrRes.data) {
          const enrollMap: Record<string, { id: string; tasks_completed: number; points_earned: number; reward_claimed: boolean }> = {};
          loyaltyEnrRes.data.forEach((e: any) => { enrollMap[e.program_id] = { id: e.id, tasks_completed: e.tasks_completed, points_earned: e.points_earned || 0, reward_claimed: e.reward_claimed }; });
          setLoyaltyEnrollments(enrollMap);
        }
      }

      setLoading(false);

      // Check volunteer onboarding wizard eligibility
      if (contextClubId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [membershipRes, onboardingRes, seasonContractRes] = await Promise.all([
          supabase.from('club_memberships').select('joined_at').eq('volunteer_id', uid).eq('club_id', contextClubId).limit(1).maybeSingle(),
          supabase.from('volunteer_onboarding_steps').select('step, completed_at, skipped').eq('user_id', uid).eq('club_id', contextClubId),
          (supabase.from('season_contracts') as any).select('id, signing_url, status').eq('volunteer_id', uid).eq('club_id', contextClubId).eq('status', 'pending').limit(1).maybeSingle(),
        ]);

        const membership = membershipRes.data;
        const onboardingSteps = onboardingRes.data || [];
        const allCompleted = ['profile_complete', 'contract_signed', 'training_done', 'first_task'].every(
          s => onboardingSteps.some((os: any) => os.step === s && (os.completed_at || os.skipped))
        );
        const isNew = membership && new Date(membership.joined_at) > sevenDaysAgo;
        const hasPendingContract = !!seasonContractRes.data;
        const dismissed = localStorage.getItem(`vol-onboarding-dismissed-${uid}-${contextClubId}`);

        if (isNew && hasPendingContract && !allCompleted && !dismissed) {
          setVolunteerOnboardingContract(seasonContractRes.data);
          setShowVolunteerOnboarding(true);
        }
      }

      // Check if volunteer tour should be shown (onboarding completed but tour not yet seen)
      if (!showVolunteerOnboarding) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_tour_seen')
          .eq('id', uid)
          .maybeSingle();
        if (profileData && !(profileData as any).first_tour_seen) {
          setShowVolunteerTour(true);
        }
      }

      // Fetch pending reviews: completed tasks in last 14 days without a volunteer review
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const { data: completedSignups } = await supabase
        .from('task_signups')
        .select('id, task_id, status')
        .eq('volunteer_id', uid)
        .eq('status', 'completed');

      if (completedSignups && completedSignups.length > 0) {
        const signupIds = completedSignups.map(s => s.id);
        const completedTaskIds = completedSignups.map(s => s.task_id);

        const [reviewsRes, reviewTasksRes] = await Promise.all([
          supabase.from('task_reviews' as any).select('task_signup_id').in('task_signup_id', signupIds).eq('reviewer_role', 'volunteer'),
          supabase.from('tasks').select('id, title, task_date, club_id, clubs(name, owner_id)').in('id', completedTaskIds),
        ]);

        const reviewedSignupIds = new Set((reviewsRes.data || []).map((r: any) => r.task_signup_id));
        const reviewTaskMap = new Map((reviewTasksRes.data || []).map((t: any) => [t.id, t]));

        const pending = completedSignups
          .filter(s => !reviewedSignupIds.has(s.id))
          .map(s => {
            const task = reviewTaskMap.get(s.task_id) as any;
            if (!task || (task.task_date && new Date(task.task_date) < fourteenDaysAgo)) return null;
            return {
              taskSignupId: s.id,
              taskTitle: task.title,
              clubName: task.clubs?.name || '',
              clubOwnerId: task.clubs?.owner_id || '',
            };
          })
          .filter(Boolean) as any[];

        setPendingReviews(pending);
      }

      // Check compliance – only prompt once per calendar month (first visit)
      const now = new Date();
      const complianceKey = `compliance-prompted-${now.getFullYear()}-${now.getMonth() + 1}`;
      const alreadyPrompted = localStorage.getItem(complianceKey);
      if (!alreadyPrompted) {
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const { data: existingDecls } = await supabase.from('compliance_declarations').select('id').eq('volunteer_id', contextUserId2!).eq('declaration_year', prevYear).eq('declaration_month', prevMonth).limit(1);
        if (!existingDecls || existingDecls.length === 0) {
          setShowComplianceDialog(true);
          localStorage.setItem(complianceKey, 'true');
        }
      }
    };

    init();
  }, [contextUserId2]);

  // Auto-redirect volunteer to live safety event from any tab (realtime + fallback polling)
  useEffect(() => {
    if (!currentUserId) return;

    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let channels: any[] = [];

    const fetchMyEventIds = async (): Promise<string[]> => {
      const { data: mySignups } = await supabase
        .from('task_signups')
        .select('task_id')
        .eq('volunteer_id', currentUserId);

      const taskIds = [...new Set((mySignups || []).map(s => s.task_id))];
      if (taskIds.length === 0) return [];

      const { data: myTasks } = await supabase
        .from('tasks')
        .select('event_id')
        .in('id', taskIds)
        .not('event_id', 'is', null);

      return [...new Set((myTasks || []).map(t => t.event_id).filter(Boolean) as string[])];
    };

    const checkForLiveEvent = async (eventIds: string[]) => {
      if (!mounted || eventIds.length === 0) return;

      const { data: liveEvents } = await supabase
        .from('events')
        .select('id')
        .in('id', eventIds)
        .eq('is_live', true)
        .limit(1);

      if (!mounted) return;
      const liveEventId = liveEvents?.[0]?.id;
      if (liveEventId) {
        navigate(`/safety/${liveEventId}`);
      }
    };

    const setupLiveListeners = async () => {
      const eventIds = await fetchMyEventIds();
      if (!mounted) return;

      await checkForLiveEvent(eventIds);

      if (eventIds.length > 0) {
        channels = eventIds.map((eventId) =>
          supabase
            .channel(`volunteer-live-${currentUserId}-${eventId}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
              (payload: any) => {
                if (payload.new?.is_live === true) {
                  navigate(`/safety/${eventId}`);
                }
              }
            )
            .subscribe()
        );
      }

      intervalId = setInterval(async () => {
        if (document.visibilityState === 'hidden') return;
        const refreshedEventIds = await fetchMyEventIds();
        await checkForLiveEvent(refreshedEventIds);
      }, 30000);
    };

    setupLiveListeners();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [currentUserId, navigate]);

  // Check for active safety incidents on volunteer's today events
  useEffect(() => {
    if (!currentUserId) return;
    const check = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: mySignups } = await supabase.from('task_signups').select('task_id').eq('volunteer_id', currentUserId).eq('status', 'assigned');
      if (!mySignups?.length) return;
      const { data: myTasks } = await supabase.from('tasks').select('event_id').in('id', mySignups.map(s => s.task_id)).not('event_id', 'is', null);
      const eventIds = [...new Set((myTasks || []).map(t => t.event_id).filter(Boolean) as string[])];
      if (eventIds.length === 0) return;
      // Filter to today's events
      const { data: todayEvents } = await supabase.from('events').select('id').in('id', eventIds).gte('event_date', today).lte('event_date', today + 'T23:59:59');
      if (!todayEvents?.length) return;
      const { data: incidents } = await supabase.from('safety_incidents').select('id').in('event_id', todayEvents.map(e => e.id)).neq('status', 'opgelost').limit(1);
      setSafetyAlertActive((incidents?.length || 0) > 0);
    };
    check();
  }, [currentUserId]);

  // ===== HANDLERS =====
  const handleSignup = async (taskId: string) => {
    if (!currentUserId) return;
    setSigningUp(taskId);
    const { error } = await supabase.from('task_signups').insert({ task_id: taskId, volunteer_id: currentUserId });
    if (error) { toast.error(error.message); } else {
      toast.success(t.volunteer.step3Title + '!');
      toast.info(language === 'nl' ? 'Taak ingeschreven! Je punten worden bijgewerkt.' : language === 'fr' ? 'Tâche inscrite ! Vos points seront mis à jour.' : 'Task signed up! Your points will be updated.');
      setSignups(prev => [...prev, { task_id: taskId, status: 'pending' }]);
      setSignupCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
      setBadgeRefreshKey(k => k + 1);
    }
    setSigningUp(null);
  };

  const handleCancelSignup = async (taskId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase.from('task_signups').delete().eq('task_id', taskId).eq('volunteer_id', currentUserId);
    if (error) { toast.error(error.message); } else {
      setSignups(prev => prev.filter(s => s.task_id !== taskId));
      setSignupCounts(prev => ({ ...prev, [taskId]: Math.max((prev[taskId] || 1) - 1, 0) }));
    }
  };

  const handleLikeToggle = (taskId: string, liked: boolean) => {
    if (liked) {
      setMyLikes(prev => new Set(prev).add(taskId));
      setLikeCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
    } else {
      setMyLikes(prev => { const s = new Set(prev); s.delete(taskId); return s; });
      setLikeCounts(prev => ({ ...prev, [taskId]: Math.max((prev[taskId] || 1) - 1, 0) }));
    }
  };

  const handleEnrollLoyalty = async (programId: string) => {
    if (!currentUserId) return;
    setEnrollingProgram(programId);
    const { data, error } = await supabase.from('loyalty_enrollments').insert({ program_id: programId, volunteer_id: currentUserId }).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') { toast.info(language === 'nl' ? 'Je bent al ingeschreven!' : language === 'fr' ? 'Vous êtes déjà inscrit!' : 'You are already enrolled!'); }
      else { toast.error(error.message); }
    } else if (data) {
      toast.success(language === 'nl' ? 'Ingeschreven voor loyaliteitsprogramma!' : language === 'fr' ? 'Inscrit au programme de fidélité!' : 'Enrolled in loyalty program!');
      trackEvent('loyalty_program_enrolled', { program_id: programId });
      setLoyaltyEnrollments(prev => ({ ...prev, [programId]: { id: data.id, tasks_completed: 0, points_earned: 0, reward_claimed: false } }));
    }
    setEnrollingProgram(null);
  };

  const isSignedUp = (taskId: string) => signups.some(s => s.task_id === taskId);
  const getSignupStatus = (taskId: string) => signups.find(s => s.task_id === taskId)?.status || null;

  const pendingSignups = signups.filter(s => s.status === 'pending');
  const assignedSignups = signups.filter(s => s.status === 'assigned');

  const handleSignContract = (taskId: string) => {
    const contract = myContracts.find(c => c.task_id === taskId);
    if (contract) {
      if (contract.status === 'pending' && contract.signing_url) { window.open(contract.signing_url, '_blank'); }
      else if (contract.status === 'completed' && contract.document_url) { window.open(contract.document_url, '_blank'); }
      else { setActiveTab('contracts'); }
    } else {
      toast.info(language === 'nl' ? 'Het contract is nog niet verstuurd door de club.' : language === 'fr' ? 'Le contrat n\'a pas encore été envoyé par le club.' : 'The contract has not been sent yet.');
    }
  };

  const handleCheckContractStatus = async (contractId: string) => {
    setCheckingContract(contractId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=check-status`;
      const resp = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ signature_request_id: contractId }) });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setMyContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: data.status, document_url: data.document_url || c.document_url } : c));
        if (data.status === 'completed') { toast.success(language === 'nl' ? 'Contract is ondertekend!' : language === 'fr' ? 'Contrat signé !' : 'Contract signed!'); } else { toast.info(language === 'nl' ? 'Contract is nog in afwachting.' : language === 'fr' ? 'Contrat en attente.' : 'Contract still pending.'); }
      }
    } catch { toast.error(language === 'nl' ? 'Kon de status niet ophalen.' : language === 'fr' ? 'Impossible de récupérer le statut.' : 'Could not fetch status.'); }
    setCheckingContract(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  // ===== DERIVED DATA (used by EventDetailDialog) =====

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <VolunteerCardsSkeleton />
      </div>
    );
  }

  const selectedEventGroups = selectedEvent
    ? eventGroups.filter(g => g.event_id === selectedEvent.id).map(g => ({
        ...g,
        tasks: tasks.filter(t => t.event_group_id === g.id),
      }))
    : [];

  const sidebarEl = (
    <VolunteerSidebar
      activeTab={activeTab}
      setActiveTab={(tab) => { setActiveTab(tab); }}
      profile={profile}
      language={language}
      onLogout={handleLogout}
      onOpenProfile={() => setShowProfileDialog(true)}
      userId={currentUserId}
      counts={{
        pending: pendingSignups.length,
        assigned: assignedSignups.length,
      payments: [...myPayments.filter(p => p.status !== 'succeeded'), ...sepaPayouts.filter(s => s.batch_status !== 'downloaded' || s.error_flag)].length || undefined,
        contracts: myContracts.filter(c => c.status === 'pending').length,
        loyalty: loyaltyPrograms.filter(p => !loyaltyEnrollments[p.id]).length || undefined,
      }}
    />
  );

  return (
    <DashboardLayout sidebar={sidebarEl} userId={currentUserId}>
      {/* Volunteer Onboarding Wizard overlay */}
      {showVolunteerOnboarding && currentUserId && contextClubId && (
        <VolunteerOnboardingWizard
          userId={currentUserId}
          clubId={contextClubId}
          clubName={contextClubInfo?.name || ''}
          clubLogoUrl={contextClubInfo?.logo_url || null}
          language={language}
          seasonContract={volunteerOnboardingContract}
          onComplete={() => setShowVolunteerOnboarding(false)}
          onLater={() => {
            localStorage.setItem(`vol-onboarding-dismissed-${currentUserId}-${contextClubId}`, 'true');
            setShowVolunteerOnboarding(false);
          }}
        />
      )}

      {/* ===== DASHBOARD HOME ===== */}
      {activeTab === 'dashboard' && (
        <VolunteerDashboardHome
          language={language}
          currentUserId={currentUserId}
          profile={profile}
          followedClubIds={followedClubIds}
          myContracts={myContracts}
          myCertifiedTrainingIds={myCertifiedTrainingIds}
          signups={signups}
          tasks={tasks}
          events={events}
          myPayments={myPayments}
          sepaPayouts={sepaPayouts}
          pendingSignups={pendingSignups}
          assignedSignups={assignedSignups}
          complianceData={complianceData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setActiveTab={(tab) => setActiveTab(tab as VolunteerTab)}
          setShowProfileDialog={setShowProfileDialog}
          getSignupStatus={getSignupStatus}
          loyaltyEnrollments={loyaltyEnrollments}
        />
      )}

      {/* ===== MONTHLY TAB ===== */}
      {activeTab === 'monthly' && currentUserId && (
        <VolunteerMonthlyTab language={language} userId={currentUserId} clubId={contextClubId || undefined} />
      )}

      {activeTab === 'contracts' && (
        <VolunteerContractsTab contracts={myContracts} language={language} checkingContract={checkingContract} onCheckStatus={handleCheckContractStatus} userId={currentUserId} />
      )}

      {/* ===== PAYMENTS TAB ===== */}
      {activeTab === 'payments' && (
        <VolunteerPaymentsTab sepaPayouts={sepaPayouts} payments={myPayments} language={language} />
      )}

      {/* ===== GROW TAB ===== */}
      {activeTab === 'grow' && currentUserId && (
        <VolunteerGrowTab
          language={language}
          userId={currentUserId}
          loyaltyPrograms={loyaltyPrograms}
          loyaltyEnrollments={loyaltyEnrollments}
          enrollingProgram={enrollingProgram}
          onEnroll={handleEnrollLoyalty}
        />
      )}

      {/* ===== CLUB TASKS BROWSER ===== */}
      {(activeTab as string) === 'club-tasks' && currentUserId && (
        <VolunteerClubTasksBrowser
          language={language}
          userId={currentUserId}
          onBack={() => setActiveTab('dashboard')}
        />
      )}

      {/* ===== MY TASKS ===== */}
      {activeTab === 'mine' && (
        <>
          {pendingReviews.length > 0 && (
            <div className="max-w-5xl mx-auto mb-4">
              <h2 className="text-xl font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {language === 'nl' ? 'Te beoordelen' : language === 'fr' ? 'À évaluer' : 'Pending reviews'}
              </h2>
              <div className="space-y-2">
                {pendingReviews.map((pr) => (
                  <motion.div key={pr.taskSignupId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-5 border border-yellow-200/50 dark:border-yellow-800/30 shadow-sm flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground truncate">{pr.taskTitle}</p>
                      <p className="text-sm text-muted-foreground">{pr.clubName}</p>
                    </div>
                    <button
                      onClick={() => setReviewTarget({ taskSignupId: pr.taskSignupId, taskTitle: pr.taskTitle, revieweeId: pr.clubOwnerId })}
                      className="shrink-0 h-12 px-5 rounded-xl text-sm font-semibold bg-yellow-500 text-white hover:bg-yellow-600 transition-colors flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      {language === 'nl' ? 'Beoordeel' : language === 'fr' ? 'Évaluer' : 'Review'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          <VolunteerTasksList
            language={language}
            currentUserId={currentUserId}
            tasks={tasks}
            signups={signups}
            myContracts={myContracts}
            getSignupStatus={getSignupStatus}
          />
          <div className="mt-8">
            {myTickets.length > 0 ? (
              <VolunteerTicketsTab
                tickets={myTickets}
                language={language}
                profile={profile}
                userId={currentUserId}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
                <Ticket className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {language === 'nl' ? 'Nog geen tickets — tickets verschijnen hier zodra je wordt ingeschreven voor een evenement.' :
                   language === 'fr' ? 'Aucun billet pour l\'instant — les billets apparaîtront ici dès que vous êtes inscrit à un événement.' :
                   'No tickets yet — tickets will appear here once you\'re enrolled for an event.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== DIALOGS ===== */}
      <EventDetailDialog
        event={selectedEvent}
        groups={selectedEventGroups}
        open={!!selectedEvent}
        onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}
        language={language}
        signupCounts={signupCounts}
        isSignedUp={isSignedUp}
        getSignupStatus={getSignupStatus}
        onTaskClick={(taskId) => { setSelectedEvent(null); navigate(`/task/${taskId}`); }}
      />

      {currentUserId && (
        <EditProfileDialog
          open={showProfileDialog}
          onOpenChange={(open) => { setShowProfileDialog(open); if (!open) setIsFirstLogin(false); }}
          userId={currentUserId}
          language={language}
          isFirstLogin={isFirstLogin}
          onProfileUpdated={(updated) => { setProfile(prev => prev ? { ...prev, full_name: updated.full_name || prev.full_name, avatar_url: updated.avatar_url } : prev); setIsFirstLogin(false); }}
        />
      )}

      {currentUserId && (
        <MonthlyComplianceDialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog} userId={currentUserId} language={language} onCompleted={() => setShowComplianceDialog(false)} />
      )}

      {/* Task Review Dialog */}
      {reviewTarget && currentUserId && (
        <TaskReviewDialog
          open={!!reviewTarget}
          onOpenChange={(open) => { if (!open) setReviewTarget(null); }}
          language={language}
          taskSignupId={reviewTarget.taskSignupId}
          taskTitle={reviewTarget.taskTitle}
          reviewerId={currentUserId}
          revieweeId={reviewTarget.revieweeId}
          reviewerRole="volunteer"
          onReviewed={() => {
            setPendingReviews(prev => prev.filter(r => r.taskSignupId !== reviewTarget.taskSignupId));
            setReviewTarget(null);
          }}
        />
      )}

      {/* Volunteer Onboarding Tour */}
      {currentUserId && (
        <VolunteerOnboardingTour
          open={showVolunteerTour && !showVolunteerOnboarding}
          onClose={() => setShowVolunteerTour(false)}
          onNavigateTab={(tab) => setActiveTab(tab as VolunteerTab)}
          userId={currentUserId}
        />
      )}
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
