import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, Search, CheckCircle, Heart, MessageCircle, FileSignature, CreditCard, Clock, AlertTriangle, Download, ClipboardList, CalendarDays, Gift, Ticket, Banknote, Award, TrendingUp, Star } from 'lucide-react';
import HourConfirmationDialog from '@/components/HourConfirmationDialog';
import LikeButton from '@/components/LikeButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import EditProfileDialog from '@/components/EditProfileDialog';
import { Language } from '@/i18n/translations';
import { VolunteerBriefingsList } from '@/components/VolunteerBriefingView';
import MonthlyComplianceDialog from '@/components/MonthlyComplianceDialog';
import ComplianceBadge from '@/components/ComplianceBadge';
import { useComplianceData } from '@/hooks/useComplianceData';
import EventDetailDialog from '@/components/EventDetailDialog';
import TicketDownloadButtons from '@/components/TicketDownloadButtons';
import AcademyTab from '@/components/AcademyTab';
import DashboardLayout from '@/components/DashboardLayout';
import VolunteerSidebar, { VolunteerTab } from '@/components/VolunteerSidebar';
import VolunteerActivitiesSection from '@/components/VolunteerActivitiesSection';
import VolunteerPartnerTab from '@/components/VolunteerPartnerTab';
import VolunteerSafetyTab from '@/components/VolunteerSafetyTab';
import VolunteerMonthlyTab from '@/components/VolunteerMonthlyTab';

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
  stripe_receipt_url: string | null;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [signups, setSignups] = useState<TaskSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url?: string | null } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<VolunteerTab>('dashboard');
  const [mineSubTab, setMineSubTab] = useState<'pending' | 'assigned' | 'history'>('pending');
  const [_signingContract, _setSigningContract] = useState<string | null>(null);
  const [myPayments, setMyPayments] = useState<VolunteerPayment[]>([]);
  const [myContracts, setMyContracts] = useState<SignatureContract[]>([]);
  const [checkingContract, setCheckingContract] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<VolunteerTicket[]>([]);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [sepaPayouts, setSepaPayouts] = useState<SepaPayoutItem[]>([]);
  const [safetyPendingCount, setSafetyPendingCount] = useState(0);

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

  const { data: complianceData } = useComplianceData(currentUserId || null);

  // ===== ALL EXISTING DATA FETCHING & HANDLERS =====
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, phone, bio, date_of_birth')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(profileData);

      if (profileData && !profileData.full_name && !profileData.phone && !profileData.bio) {
        setIsFirstLogin(true);
        setShowProfileDialog(true);
      }

      // Fetch tasks with club info
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, clubs(name, sport, location)')
        .eq('status', 'open')
        .order('task_date', { ascending: true });

      if (tasksError) {
        console.error('Tasks error:', tasksError);
      } else {
        let enrichedTasks = tasksData || [];
        if (enrichedTasks.length > 0) {
          const taskIds = enrichedTasks.map(t => t.id);
          const { data: taskExtras } = await (supabase as any)
            .from('tasks')
            .select('id, event_id, event_group_id')
            .in('id', taskIds);
          const extraMap = new Map((taskExtras || []).map((t: any) => [t.id, t]));
          enrichedTasks = enrichedTasks.map(t => ({
            ...t,
            event_id: (extraMap.get(t.id) as any)?.event_id || null,
            event_group_id: (extraMap.get(t.id) as any)?.event_group_id || null,
          }));

          const trainingEventIds = new Set<string>();
          if (enrichedTasks.some(t => t.event_id)) {
            const eventIdsToCheck = [...new Set(enrichedTasks.filter(t => t.event_id).map(t => t.event_id!))] as string[];
            if (eventIdsToCheck.length > 0) {
              const { data: trainingEvents } = await (supabase as any).from('events').select('id').eq('event_type', 'training').in('id', eventIdsToCheck);
              (trainingEvents || []).forEach((e: any) => trainingEventIds.add(e.id));
            }
          }
          enrichedTasks = enrichedTasks.filter(t => !t.event_id || !trainingEventIds.has(t.event_id));
        }
        setTasks(enrichedTasks);

        if (enrichedTasks.length > 0) {
          const taskIds = enrichedTasks.map(t => t.id);
          const { data: countData } = await supabase.from('task_signups').select('task_id').in('task_id', taskIds);
          if (countData) {
            const counts: Record<string, number> = {};
            countData.forEach(s => { counts[s.task_id] = (counts[s.task_id] || 0) + 1; });
            setSignupCounts(counts);
          }
          const { data: likeData } = await supabase.from('task_likes').select('task_id').in('task_id', taskIds);
          if (likeData) {
            const lCounts: Record<string, number> = {};
            likeData.forEach(l => { lCounts[l.task_id] = (lCounts[l.task_id] || 0) + 1; });
            setLikeCounts(lCounts);
          }
          const { data: myLikeData } = await supabase.from('task_likes').select('task_id').eq('user_id', session.user.id);
          if (myLikeData) { setMyLikes(new Set(myLikeData.map(l => l.task_id))); }
        }
      }

      // Fetch events
      const { data: allEventsData } = await (supabase as any).from('events').select('*').is('training_id', null).neq('event_type', 'training').neq('status', 'on_hold').order('event_date', { ascending: true });
      if (allEventsData && allEventsData.length > 0) {
        const clubIds = [...new Set(allEventsData.map((e: any) => e.club_id))] as string[];
        const { data: clubsData } = await supabase.from('clubs').select('id, name').in('id', clubIds);
        const clubMap = new Map(clubsData?.map(c => [c.id, c.name]) || []);
        setEvents(allEventsData.map((e: any) => ({ ...e, club_name: clubMap.get(e.club_id) || '' })));

        const allEventIds = allEventsData.map((e: any) => e.id);
        const { data: groupsData } = await (supabase as any).from('event_groups').select('*').in('event_id', allEventIds).order('sort_order', { ascending: true });
        setEventGroups(groupsData || []);
      }

      const { data: signupsData } = await supabase.from('task_signups').select('task_id, status').eq('volunteer_id', session.user.id);
      setSignups(signupsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase.from('volunteer_payments').select('id, task_id, amount, currency, status, paid_at, created_at, stripe_receipt_url').eq('volunteer_id', session.user.id).order('created_at', { ascending: false });
      if (paymentsData && paymentsData.length > 0) {
        const paymentTaskIds = [...new Set(paymentsData.map(p => p.task_id))];
        const { data: paymentTasks } = await supabase.from('tasks').select('id, title, club_id, clubs(name)').in('id', paymentTaskIds);
        const taskMap = new Map(paymentTasks?.map(t => [t.id, t]) || []);
        setMyPayments(paymentsData.map(p => { const t = taskMap.get(p.task_id); return { ...p, task_title: t?.title, club_name: (t as any)?.clubs?.name }; }));
      }

      // Fetch SEPA batch items
      const { data: sepaItems } = await (supabase as any)
        .from('sepa_batch_items')
        .select('id, amount, status, created_at, error_flag, error_message, batch_id, task_id, volunteer_id')
        .eq('volunteer_id', session.user.id)
        .order('created_at', { ascending: false });
      if (sepaItems && sepaItems.length > 0) {
        const batchIds = [...new Set(sepaItems.map((s: any) => s.batch_id))] as string[];
        const sepaTaskIds = [...new Set(sepaItems.map((s: any) => s.task_id))] as string[];
        const { data: batchesData } = await (supabase as any).from('sepa_batches').select('id, status, batch_reference, club_id').in('id', batchIds);
        const batchMap = new Map((batchesData || []).map((b: any) => [b.id, b]));
        const { data: sepaTasks } = await supabase.from('tasks').select('id, title, club_id, clubs(name)').in('id', sepaTaskIds);
        const sepaTaskMap = new Map(sepaTasks?.map(t => [t.id, t]) || []);
        setSepaPayouts(sepaItems.map((item: any) => {
          const batch = batchMap.get(item.batch_id) as any;
          const task = sepaTaskMap.get(item.task_id);
          return {
            id: item.id, amount: Number(item.amount), status: item.status, created_at: item.created_at,
            error_flag: item.error_flag, error_message: item.error_message,
            batch_status: batch?.status || 'pending', batch_reference: batch?.batch_reference || '',
            task_title: task?.title, club_name: (task as any)?.clubs?.name,
          };
        }));
      }

      // Fetch contracts
      const { data: contractsData } = await supabase.from('signature_requests').select('id, task_id, status, signing_url, document_url, created_at, updated_at').eq('volunteer_id', session.user.id).order('created_at', { ascending: false });
      if (contractsData && contractsData.length > 0) {
        const contractTaskIds = [...new Set(contractsData.map(c => c.task_id))];
        const { data: contractTasks } = await supabase.from('tasks').select('id, title, clubs(name)').in('id', contractTaskIds);
        const ctMap = new Map(contractTasks?.map(t => [t.id, t]) || []);
        setMyContracts(contractsData.map(c => { const t = ctMap.get(c.task_id); return { ...c, task_title: t?.title, club_name: (t as any)?.clubs?.name }; }));
      }

      // Fetch tickets
      const { data: ticketsData } = await (supabase as any).from('volunteer_tickets').select('id, task_id, event_id, club_id, status, ticket_url, barcode, external_ticket_id, created_at, checked_in_at').eq('volunteer_id', session.user.id).order('created_at', { ascending: false });
      if (ticketsData && ticketsData.length > 0) {
        const ticketClubIds = [...new Set(ticketsData.map((t: any) => t.club_id))] as string[];
        const ticketTaskIds = [...new Set(ticketsData.filter((t: any) => t.task_id).map((t: any) => t.task_id))] as string[];
        const ticketEventIds = [...new Set(ticketsData.filter((t: any) => t.event_id).map((t: any) => t.event_id))] as string[];
        const { data: tClubs } = await supabase.from('clubs').select('id, name').in('id', ticketClubIds);
        const clubMap2 = new Map(tClubs?.map(c => [c.id, c.name]) || []);
        const taskMap2 = new Map<string, string>();
        if (ticketTaskIds.length > 0) {
          const { data: tTasks } = await supabase.from('tasks').select('id, title').in('id', ticketTaskIds);
          tTasks?.forEach(t => taskMap2.set(t.id, t.title));
        }
        const eventMap2 = new Map<string, string>();
        if (ticketEventIds.length > 0) {
          const { data: tEvents } = await (supabase as any).from('events').select('id, title').in('id', ticketEventIds);
          tEvents?.forEach((e: any) => eventMap2.set(e.id, e.title));
        }
        setMyTickets(ticketsData.map((t: any) => ({
          ...t, club_name: clubMap2.get(t.club_id) || '',
          task_title: t.task_id ? taskMap2.get(t.task_id) || '' : '',
          event_title: t.event_id ? eventMap2.get(t.event_id) || '' : '',
        })));
      }

      // Fetch loyalty programs
      const { data: allPrograms } = await (supabase as any).from('loyalty_programs').select('*').eq('is_active', true);
      if (allPrograms && allPrograms.length > 0) {
        const clubIds = [...new Set(allPrograms.map((p: any) => p.club_id))] as string[];
        const { data: clubsData } = await supabase.from('clubs').select('id, name').in('id', clubIds);
        const clubMap = new Map(clubsData?.map(c => [c.id, c.name]) || []);
        setLoyaltyPrograms(allPrograms.map((p: any) => ({ ...p, club_name: clubMap.get(p.club_id) || '' })));

        const programIds = allPrograms.map((p: any) => p.id);
        const { data: myEnrollments } = await (supabase as any).from('loyalty_enrollments').select('*').eq('volunteer_id', session.user.id).in('program_id', programIds);
        if (myEnrollments) {
          const enrollMap: Record<string, { id: string; tasks_completed: number; points_earned: number; reward_claimed: boolean }> = {};
          myEnrollments.forEach((e: any) => { enrollMap[e.program_id] = { id: e.id, tasks_completed: e.tasks_completed, points_earned: e.points_earned || 0, reward_claimed: e.reward_claimed }; });
          setLoyaltyEnrollments(enrollMap);
        }
      }

      // Fetch my certificates
      const { data: myCerts } = await supabase.from('volunteer_certificates').select('training_id').eq('volunteer_id', session.user.id);
      if (myCerts) { setMyCertifiedTrainingIds(new Set(myCerts.map(c => c.training_id))); }

      // Fetch followed clubs
      const { data: followsData } = await supabase.from('club_follows').select('club_id').eq('user_id', session.user.id);
      setFollowedClubIds(new Set(followsData?.map(f => f.club_id) || []));

      setLoading(false);

      // Check compliance – only prompt once per calendar month (first visit)
      const now = new Date();
      const complianceKey = `compliance-prompted-${now.getFullYear()}-${now.getMonth() + 1}`;
      const alreadyPrompted = localStorage.getItem(complianceKey);
      if (!alreadyPrompted) {
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const { data: existingDecls } = await supabase.from('compliance_declarations').select('id').eq('volunteer_id', session.user.id).eq('declaration_year', prevYear).eq('declaration_month', prevMonth).limit(1);
        if (!existingDecls || existingDecls.length === 0) {
          setShowComplianceDialog(true);
          localStorage.setItem(complianceKey, 'true');
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { if (!session) navigate('/login'); });
    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

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
        const refreshedEventIds = await fetchMyEventIds();
        await checkForLiveEvent(refreshedEventIds);
      }, 3000);
    };

    setupLiveListeners();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [currentUserId, navigate]);

  // ===== HANDLERS =====
  const handleSignup = async (taskId: string) => {
    setSigningUp(taskId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from('task_signups').insert({ task_id: taskId, volunteer_id: session.user.id });
    if (error) { toast.error(error.message); } else {
      toast.success(t.volunteer.step3Title + '!');
      setSignups(prev => [...prev, { task_id: taskId, status: 'pending' }]);
      setSignupCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
    }
    setSigningUp(null);
  };

  const handleCancelSignup = async (taskId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from('task_signups').delete().eq('task_id', taskId).eq('volunteer_id', session.user.id);
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
    const { data, error } = await (supabase as any).from('loyalty_enrollments').insert({ program_id: programId, volunteer_id: currentUserId }).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') { toast.info(language === 'nl' ? 'Je bent al ingeschreven!' : language === 'fr' ? 'Vous êtes déjà inscrit!' : 'You are already enrolled!'); }
      else { toast.error(error.message); }
    } else if (data) {
      toast.success(language === 'nl' ? 'Ingeschreven voor loyaliteitsprogramma!' : language === 'fr' ? 'Inscrit au programme de fidélité!' : 'Enrolled in loyalty program!');
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
      toast.info(language === 'nl' ? 'Het contract is nog niet verstuurd door de club.' : 'The contract has not been sent yet.');
    }
  };

  const handleCheckContractStatus = async (contractId: string) => {
    setCheckingContract(contractId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=check-status`;
      const resp = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ signature_request_id: contractId }) });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setMyContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: data.status, document_url: data.document_url || c.document_url } : c));
        if (data.status === 'completed') { toast.success('Contract is ondertekend!'); } else { toast.info('Contract is nog in afwachting.'); }
      }
    } catch { toast.error('Kon de status niet ophalen.'); }
    setCheckingContract(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  // ===== DERIVED DATA =====
  const hasFollows = followedClubIds !== null && followedClubIds.size > 0;
  const feedTasks = hasFollows && (activeTab === 'all' || activeTab === 'dashboard')
    ? tasks.filter(t => followedClubIds!.has(t.club_id))
    : tasks;
  const looseTasks = feedTasks.filter(t => !t.event_id);
  const eventTasks = feedTasks.filter(t => t.event_id);

  const filteredLooseTasks = looseTasks.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q) || task.clubs?.name.toLowerCase().includes(q) || task.clubs?.sport?.toLowerCase().includes(q) || task.location?.toLowerCase().includes(q);
    if (activeTab === 'mine') {
      const status = getSignupStatus(task.id);
      if (!status) return false;
      const isPast = task.task_date ? new Date(task.task_date) < new Date() : false;
      if (mineSubTab === 'history') {
        return matchesSearch && isPast;
      }
      if (isPast) return false;
      return matchesSearch && status === mineSubTab;
    }
    return matchesSearch;
  });

  const filteredEvents = events.filter(event => {
    if (hasFollows && (activeTab === 'all' || activeTab === 'dashboard') && !followedClubIds!.has(event.club_id)) return false;
    if (activeTab === 'mine') {
      const isPastEvent = event.event_date ? new Date(event.event_date) < new Date() : false;
      if (mineSubTab === 'history') return isPastEvent;
      if (isPastEvent) return false;
      const evTasks = tasks.filter(t => t.event_id === event.id);
      return evTasks.some(t => {
        const status = getSignupStatus(t.id);
        return status === mineSubTab;
      });
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return event.title.toLowerCase().includes(q) || event.location?.toLowerCase().includes(q) || event.club_name?.toLowerCase().includes(q);
  });

  const dashboardT = {
    nl: { welcome: 'Welkom terug', subtitle: 'Samen maken we sport mogelijk.', availableTasks: 'Beschikbare taken', searchPlaceholder: 'Zoek taken, clubs of locaties...', noTasks: 'Er zijn momenteel geen openstaande taken.', signUp: 'Inschrijven', signedUp: 'Ingeschreven', assigned: 'Toegekend', cancel: 'Annuleren', spots: 'plaatsen', mySignups: 'Mijn inschrijvingen', allTasks: 'Alle taken', myTasks: 'Mijn taken', noMyTasks: 'Geen taken in deze categorie.', signContract: 'Contract ondertekenen', ingeschreven: 'Ingeschreven', toegekend: 'Toegekend', payments: 'Vergoedingen', noPayments: 'Je hebt nog geen vergoedingen ontvangen.', paid: 'Betaald', processing: 'Verwerken', pending: 'In afwachting', failed: 'Mislukt', receipt: 'Betaalbewijs', paidOn: 'Betaald op', contracts: 'Contracten', noContracts: 'Je hebt nog geen contracten.', signed: 'Ondertekend', awaitingSignature: 'Wacht op ondertekening', signNow: 'Nu ondertekenen', downloadContract: 'Download contract', checkStatus: 'Status ophalen', sentOn: 'Verstuurd op', events: 'Evenementen', looseTasks: 'Overige taken', viewEvent: 'Bekijk evenement', upcomingTasks: 'Aankomende taken', quickStats: 'Overzicht', totalEarned: 'Totaal verdiend', tasksCompleted: 'Voltooid', openTasks: 'Open taken', viewAll: 'Bekijk alles', goToMessages: 'Ga naar berichten', recentMessages: 'Berichten' },
    fr: { welcome: 'Bienvenue', subtitle: 'Ensemble, rendons le sport possible.', availableTasks: 'Tâches disponibles', searchPlaceholder: 'Rechercher des tâches, clubs ou lieux...', noTasks: 'Aucune tâche disponible.', signUp: 'S\'inscrire', signedUp: 'Inscrit', assigned: 'Attribué', cancel: 'Annuler', spots: 'places', mySignups: 'Mes inscriptions', allTasks: 'Toutes les tâches', myTasks: 'Mes tâches', noMyTasks: 'Aucune tâche.', signContract: 'Signer le contrat', ingeschreven: 'Inscrits', toegekend: 'Attribués', payments: 'Remboursements', noPayments: 'Aucun remboursement.', paid: 'Payé', processing: 'En cours', pending: 'En attente', failed: 'Échoué', receipt: 'Reçu', paidOn: 'Payé le', contracts: 'Contrats', noContracts: 'Aucun contrat.', signed: 'Signé', awaitingSignature: 'En attente', signNow: 'Signer', downloadContract: 'Télécharger', checkStatus: 'Vérifier', sentOn: 'Envoyé le', events: 'Événements', looseTasks: 'Autres tâches', viewEvent: 'Voir', upcomingTasks: 'Prochaines tâches', quickStats: 'Aperçu', totalEarned: 'Total gagné', tasksCompleted: 'Terminées', openTasks: 'Tâches ouvertes', viewAll: 'Voir tout', goToMessages: 'Aller aux messages', recentMessages: 'Messages' },
    en: { welcome: 'Welcome back', subtitle: 'Together we make sports possible.', availableTasks: 'Available tasks', searchPlaceholder: 'Search tasks, clubs or locations...', noTasks: 'No open tasks.', signUp: 'Sign up', signedUp: 'Signed up', assigned: 'Assigned', cancel: 'Cancel', spots: 'spots', mySignups: 'My signups', allTasks: 'All tasks', myTasks: 'My tasks', noMyTasks: 'No tasks in this category.', signContract: 'Sign contract', ingeschreven: 'Signed up', toegekend: 'Assigned', payments: 'Payments', noPayments: 'No payments yet.', paid: 'Paid', processing: 'Processing', pending: 'Pending', failed: 'Failed', receipt: 'Receipt', paidOn: 'Paid on', contracts: 'Contracts', noContracts: 'No contracts.', signed: 'Signed', awaitingSignature: 'Awaiting signature', signNow: 'Sign now', downloadContract: 'Download', checkStatus: 'Check status', sentOn: 'Sent on', events: 'Events', looseTasks: 'Other tasks', viewEvent: 'View event', upcomingTasks: 'Upcoming tasks', quickStats: 'Overview', totalEarned: 'Total earned', tasksCompleted: 'Completed', openTasks: 'Open tasks', viewAll: 'View all', goToMessages: 'Go to messages', recentMessages: 'Messages' },
  };
  const dt = dashboardT[language];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedEventGroups = selectedEvent
    ? eventGroups.filter(g => g.event_id === selectedEvent.id).map(g => ({
        ...g,
        tasks: tasks.filter(t => t.event_group_id === g.id),
      }))
    : [];

  // ===== STATS =====
  const totalEarned = myPayments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0)
    + sepaPayouts.filter(s => s.batch_status === 'downloaded' && !s.error_flag).reduce((s, p) => s + p.amount, 0);

  // Upcoming assigned tasks (next 5) – only future tasks
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
    .slice(0, 5);

  // ===== ACTIVITY ITEMS =====
  const activityItems = (() => {
    const items: { id: string; type: 'contract' | 'briefing' | 'training' | 'partner_invite'; title: string; subtitle?: string; action: () => void; actionLabel: string; urgent?: boolean }[] = [];

    // Unsigned contracts for upcoming tasks
    myContracts.filter(c => c.status === 'pending' && c.signing_url).forEach(c => {
      items.push({
        id: `contract-${c.id}`,
        type: 'contract',
        title: language === 'nl' ? 'Contract ondertekenen' : language === 'fr' ? 'Signer le contrat' : 'Sign contract',
        subtitle: c.task_title ? `${c.task_title}${c.club_name ? ` · ${c.club_name}` : ''}` : c.club_name,
        action: () => window.open(c.signing_url!, '_blank'),
        actionLabel: language === 'nl' ? 'Ondertekenen' : 'Sign',
        urgent: true,
      });
    });

    // Required trainings for tasks from followed clubs
    if (followedClubIds && followedClubIds.size > 0) {
      const requiredTrainings = new Map<string, { taskTitle: string; clubName: string }>();
      tasks.forEach(t => {
        if (t.required_training_id && !myCertifiedTrainingIds.has(t.required_training_id) && followedClubIds!.has(t.club_id)) {
          if (!requiredTrainings.has(t.required_training_id)) {
            requiredTrainings.set(t.required_training_id, {
              taskTitle: t.title,
              clubName: t.clubs?.name || '',
            });
          }
        }
      });
      requiredTrainings.forEach((info, trainingId) => {
        items.push({
          id: `training-${trainingId}`,
          type: 'training',
          title: language === 'nl' ? 'Training vereist' : language === 'fr' ? 'Formation requise' : 'Training required',
          subtitle: `${info.taskTitle} · ${info.clubName}`,
          action: () => setActiveTab('academy'),
          actionLabel: language === 'nl' ? 'Bekijken' : 'View',
        });
      });
    }

    return items;
  })();


  const sidebarEl = (
    <VolunteerSidebar
      activeTab={activeTab}
      setActiveTab={(tab) => { setActiveTab(tab); if (tab === 'mine') setMineSubTab('pending'); }}
      profile={profile}
      language={language}
      onLogout={handleLogout}
      onOpenProfile={() => setShowProfileDialog(true)}
      counts={{
        pending: pendingSignups.length,
        assigned: assignedSignups.length,
        payments: myPayments.length + sepaPayouts.length,
        contracts: myContracts.length,
        tickets: myTickets.length,
        loyalty: loyaltyPrograms.length,
        safety: safetyPendingCount,
      }}
    />
  );

  return (
    <DashboardLayout sidebar={sidebarEl}>
      {/* ===== DASHBOARD HOME ===== */}
      {activeTab === 'dashboard' && (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              {dt.welcome}, {profile?.full_name || profile?.email || ''}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">{dt.subtitle}</p>
          </motion.div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={dt.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setActiveTab('all')}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-border shadow-sm"
            />
          </div>

          {/* Bento Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">€{totalEarned.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{dt.totalEarned}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-accent" />
                </div>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{assignedSignups.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{dt.tasksCompleted}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-secondary" />
                </div>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{pendingSignups.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{dt.pending}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/chat')}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground">{dt.recentMessages}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{dt.goToMessages} →</p>
            </motion.div>
          </div>

          {/* Upcoming Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading font-semibold text-foreground">{dt.upcomingTasks}</h2>
              <button onClick={() => setActiveTab('mine')} className="text-xs font-medium text-primary hover:underline">{dt.viewAll} →</button>
            </div>
            {myUpcomingTasks.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{dt.noMyTasks}</p>
                <button onClick={() => setActiveTab('all')} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                  {dt.allTasks} →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myUpcomingTasks.map((task, i) => {
                  const signupStatus = getSignupStatus(task.id);
                  const isAssigned = signupStatus === 'assigned';
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/task/${task.id}`)}
                      className={`bg-card rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${isAssigned ? 'border-accent/30' : 'border-border'}`}
                    >
                      {/* Club avatar */}
                      <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                        <AvatarFallback className="rounded-xl text-xs font-bold bg-secondary/10 text-secondary">
                          {(task.clubs?.name || '?')[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
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

          {/* Activity items */}
          <VolunteerActivitiesSection items={activityItems} language={language} />

          {/* Compliance badge */}
          {complianceData && <ComplianceBadge compliance={complianceData} language={language} />}
        </div>
      )}

      {/* ===== ACADEMY TAB ===== */}
      {activeTab === 'academy' && (
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Academy</h1>
          <AcademyTab language={language} navigate={navigate} />
        </div>
      )}

      {/* ===== TICKETS TAB ===== */}
      {activeTab === 'tickets' && (
        <div className="max-w-5xl mx-auto space-y-4">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Tickets</h1>
          {myTickets.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{language === 'nl' ? 'Geen tickets.' : 'No tickets.'}</p></div>
          ) : (
            myTickets.map((ticket, i) => (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-card rounded-2xl shadow-sm border overflow-hidden ${ticket.status === 'checked_in' ? 'border-accent/30' : 'border-border'}`}>
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ticket.task_title || ticket.event_title || 'Ticket'}</p>
                      {ticket.club_name && <p className="text-xs text-muted-foreground mt-0.5">{ticket.club_name}</p>}
                    </div>
                    <div className="shrink-0">
                      {ticket.status === 'checked_in' ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent-foreground"><CheckCircle className="w-3.5 h-3.5" />{language === 'nl' ? 'Ingecheckt' : 'Checked in'}</span>
                      ) : ticket.status === 'sent' ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary"><Ticket className="w-3.5 h-3.5" />{language === 'nl' ? 'Geldig' : 'Valid'}</span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground"><Clock className="w-3.5 h-3.5" />{language === 'nl' ? 'In afwachting' : 'Pending'}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(ticket.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                {ticket.barcode && (
                  <>
                    <div className="border-t border-dashed border-border mx-3" />
                    <div className="p-5 pt-3 flex flex-col items-center gap-3">
                      <div className="bg-white rounded-xl p-3 shadow-sm"><QRCodeSVG value={ticket.barcode} size={160} level="H" /></div>
                      <div className="bg-foreground/5 rounded-xl px-6 py-2 flex flex-col items-center gap-0.5">
                        <span className="text-xs font-mono font-bold tracking-widest text-foreground">{ticket.barcode}</span>
                      </div>
                      <TicketDownloadButtons barcode={ticket.barcode} ticketTitle={ticket.task_title || 'Ticket'} clubName={ticket.club_name} eventTitle={ticket.event_title} ticketId={ticket.id} volunteerName={profile?.full_name || undefined} language={language} />
                    </div>
                  </>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ===== LOYALTY TAB ===== */}
      {activeTab === 'loyalty' && (
        <div className="max-w-5xl mx-auto space-y-4">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{language === 'nl' ? 'Loyaliteit' : 'Loyalty'}</h1>
          {loyaltyPrograms.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Gift className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{language === 'nl' ? 'Geen programma\'s.' : 'No programs.'}</p></div>
          ) : (
            loyaltyPrograms.map((program, i) => {
              const enrollment = loyaltyEnrollments[program.id];
              const isPointsBased = program.points_based && program.required_points;
              const progress = enrollment ? (isPointsBased ? Math.min(100, (enrollment.points_earned / (program.required_points || 1)) * 100) : Math.min(100, (enrollment.tasks_completed / program.required_tasks) * 100)) : 0;
              return (
                <motion.div key={program.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><Gift className="w-4 h-4 text-primary" /><h3 className="font-heading font-semibold text-foreground">{program.name}</h3></div>
                      {program.club_name && <p className="text-xs text-muted-foreground mt-0.5">{program.club_name}</p>}
                      {program.description && <p className="text-sm text-muted-foreground mt-1">{program.description}</p>}
                      <p className="text-sm mt-2">🎁 {program.reward_description}</p>
                    </div>
                    <div className="shrink-0">
                      {!enrollment ? (
                        <button onClick={() => handleEnrollLoyalty(program.id)} disabled={enrollingProgram === program.id} className="px-3 py-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                          {language === 'nl' ? 'Deelnemen' : 'Join'}
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                          {isPointsBased ? `${enrollment.points_earned}/${program.required_points}` : `${enrollment.tasks_completed}/${program.required_tasks}`}
                        </span>
                      )}
                    </div>
                  </div>
                  {enrollment && <div className="mt-3"><div className="bg-muted rounded-full h-2 w-full"><div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progress}%` }} /></div></div>}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* ===== BRIEFINGS TAB ===== */}
      {activeTab === 'briefings' && (
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Briefings</h1>
          <VolunteerBriefingsList language={language} userId={currentUserId} />
        </div>
      )}

      {/* ===== PARTNER TAB ===== */}
      {activeTab === 'partner' && currentUserId && (
        <VolunteerPartnerTab language={language} userId={currentUserId} navigate={navigate} />
      )}

      {/* ===== SAFETY TAB ===== */}
      {activeTab === 'safety' && currentUserId && (
        <VolunteerSafetyTab language={language} userId={currentUserId} onPendingCountChange={setSafetyPendingCount} />
      )}

      {/* ===== MONTHLY TAB ===== */}
      {activeTab === 'monthly' && currentUserId && (
        <VolunteerMonthlyTab language={language} userId={currentUserId} />
      )}


      {activeTab === 'contracts' && (
        <div className="max-w-5xl mx-auto space-y-4">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{dt.contracts}</h1>
          {myContracts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{dt.noContracts}</p></div>
          ) : (
            myContracts.map((contract, i) => (
              <motion.div key={contract.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-card rounded-2xl p-5 shadow-sm border ${contract.status === 'completed' ? 'border-green-200 dark:border-green-800' : 'border-border'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{contract.task_title || 'Contract'}</p>
                    {contract.club_name && <p className="text-xs text-muted-foreground">{contract.club_name}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {contract.status === 'completed' ? <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle className="w-3.5 h-3.5" />{dt.signed}</span> : <span className="flex items-center gap-1 text-xs font-medium text-yellow-600"><Clock className="w-3.5 h-3.5" />{dt.awaitingSignature}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {contract.status === 'pending' && contract.signing_url && <a href={contract.signing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"><FileSignature className="w-3.5 h-3.5" />{dt.signNow}</a>}
                    {contract.status === 'pending' && <button onClick={() => handleCheckContractStatus(contract.id)} disabled={checkingContract === contract.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"><Clock className="w-3 h-3" />{dt.checkStatus}</button>}
                    {contract.status === 'completed' && contract.document_url && <a href={contract.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors"><Download className="w-3.5 h-3.5" />{dt.downloadContract}</a>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{dt.sentOn}: {new Date(contract.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ===== PAYMENTS TAB ===== */}
      {activeTab === 'payments' && (
        <div className="max-w-5xl mx-auto space-y-4">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{dt.payments}</h1>
          {myPayments.length === 0 && sepaPayouts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{dt.noPayments}</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{dt.paid}</p>
                  <p className="text-2xl font-heading font-bold text-green-600 mt-1">€{(
                    myPayments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0) +
                    sepaPayouts.filter(s => s.batch_status === 'downloaded' && !s.error_flag).reduce((s, p) => s + p.amount, 0)
                  ).toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{dt.processing}</p>
                  <p className="text-2xl font-heading font-bold text-primary mt-1">€{(
                    myPayments.filter(p => p.status === 'processing').reduce((s, p) => s + p.amount, 0) +
                    sepaPayouts.filter(s => ['signed', 'awaiting_signature', 'pending'].includes(s.batch_status) && !s.error_flag).reduce((s, p) => s + p.amount, 0)
                  ).toFixed(2)}</p>
                </div>
              </div>

              {sepaPayouts.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-2"><Banknote className="w-4 h-4 text-primary" />{language === 'nl' ? 'SEPA Vergoedingen' : 'SEPA Payments'}</h3>
                  {sepaPayouts.map((payout, i) => {
                    const isExported = ['downloaded', 'signed'].includes(payout.batch_status);
                    const isPending = ['pending', 'awaiting_signature'].includes(payout.batch_status);
                    return (
                      <motion.div key={payout.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`bg-card rounded-2xl p-5 shadow-sm border ${payout.error_flag ? 'border-destructive/30' : 'border-border'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{payout.task_title || 'Taak'}</p>
                            {payout.club_name && <p className="text-xs text-muted-foreground">{payout.club_name}</p>}
                            <p className="text-lg font-heading font-bold text-foreground mt-1">€{payout.amount.toFixed(2)}</p>
                          </div>
                          <div className="shrink-0">
                            {payout.error_flag ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive"><AlertTriangle className="w-3.5 h-3.5" />{payout.error_message || 'Fout'}</span>
                            ) : isExported ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary"><CheckCircle className="w-3.5 h-3.5" />{language === 'nl' ? 'Geëxporteerd' : 'Exported'}</span>
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground"><Clock className="w-3.5 h-3.5" />{language === 'nl' ? 'In verwerking' : 'Processing'}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Ref: {payout.batch_reference} · {new Date(payout.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== ALL TASKS / MINE TASKS ===== */}
      {(activeTab === 'all' || activeTab === 'mine') && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-heading font-bold text-foreground">{activeTab === 'all' ? dt.allTasks : dt.myTasks}</h1>
            {activeTab === 'mine' && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setMineSubTab('pending')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mineSubTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{dt.ingeschreven}</button>
                <button onClick={() => setMineSubTab('assigned')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mineSubTab === 'assigned' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{dt.toegekend}</button>
                <button onClick={() => setMineSubTab('history')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mineSubTab === 'history' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{language === 'nl' ? 'Historie' : language === 'fr' ? 'Historique' : 'History'}</button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder={dt.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-border" />
          </div>

          {/* Events */}
          {filteredEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" />{dt.events}</h2>
              <div className="space-y-3">
                {filteredEvents.map((event, i) => {
                  const evTasks = tasks.filter(t => t.event_id === event.id);
                  const totalSpots = evTasks.reduce((s, t) => s + t.spots_available, 0);
                  const totalSignups = evTasks.reduce((s, t) => s + (signupCounts[t.id] || 0), 0);
                  const myEventSignups = evTasks.filter(t => isSignedUp(t.id)).length;
                  return (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedEvent(event)}
                      className={`bg-card rounded-2xl p-5 shadow-sm border transition-all cursor-pointer hover:shadow-md ${myEventSignups > 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><CalendarDays className="w-4 h-4 text-primary" />{event.club_name && <span className="text-xs text-muted-foreground">{event.club_name}</span>}</div>
                          <h3 className="font-heading font-semibold text-foreground text-lg">{event.title}</h3>
                          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                            {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{totalSignups}/{totalSpots}</span>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">{dt.viewEvent} →</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loose tasks */}
          <div>
            {filteredEvents.length > 0 && <h2 className="text-lg font-heading font-semibold text-foreground mb-3">{dt.looseTasks}</h2>}
            <div className="space-y-3">
              {filteredLooseTasks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{activeTab === 'mine' ? dt.noMyTasks : dt.noTasks}</p></div>
              ) : (
                filteredLooseTasks.map((task, i) => {
                  const signed = isSignedUp(task.id);
                  const signupStatus = getSignupStatus(task.id);
                  const isAssigned = signupStatus === 'assigned';
                  return (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/task/${task.id}`)}
                      className={`bg-card rounded-2xl p-5 shadow-sm border transition-all cursor-pointer hover:shadow-md ${isAssigned ? 'border-accent/30' : signed ? 'border-primary/30' : 'border-border'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{task.clubs?.sport || task.clubs?.name}</span>
                            {task.clubs?.name && <span className="text-xs text-muted-foreground">{task.clubs.name}</span>}
                          </div>
                          <h3 className="font-heading font-semibold text-foreground">{task.title}</h3>
                          {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                            {task.task_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                            {(task.location || task.clubs?.location) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location || task.clubs?.location}</span>}
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{signupCounts[task.id] || 0}/{task.spots_available} {dt.spots}</span>
                            {task.required_training_id && (
                              myCertifiedTrainingIds.has(task.required_training_id) ? (
                                <span className="flex items-center gap-1 text-accent font-medium"><Award className="w-3.5 h-3.5" />{language === 'nl' ? 'Gecertificeerd' : 'Certified'}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-yellow-600 font-medium"><Award className="w-3.5 h-3.5" />{language === 'nl' ? 'Training vereist' : 'Training required'}</span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <LikeButton taskId={task.id} liked={myLikes.has(task.id)} count={likeCounts[task.id] || 0} onToggle={handleLikeToggle} />
                            {isAssigned ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-accent/30 text-accent bg-accent/5 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{dt.assigned}</span>
                            ) : signed ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/30 text-primary bg-primary/5">✓ {dt.signedUp}</span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">{dt.signUp} →</span>
                            )}
                          </div>
                          {isAssigned && (
                            <button onClick={(e) => { e.stopPropagation(); handleSignContract(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                              <FileSignature className="w-3.5 h-3.5" />
                              {myContracts.some(c => c.task_id === task.id && c.status === 'pending') ? dt.signContract : dt.signContract}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
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
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
