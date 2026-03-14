import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  VolunteerTask, TaskSignup, VolunteerPayment, SignatureContract,
  VolunteerTicket, SepaPayoutItem, VolunteerEventData, VolunteerEventGroup,
  LoyaltyProgramView, LoyaltyEnrollmentView,
} from '@/types/volunteer';

export function useVolunteerData() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { userId: contextUserId, profile: contextProfile } = useClubContext();

  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [signups, setSignups] = useState<TaskSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url?: string | null } | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [myPayments, setMyPayments] = useState<VolunteerPayment[]>([]);
  const [myContracts, setMyContracts] = useState<SignatureContract[]>([]);
  const [checkingContract, setCheckingContract] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<VolunteerTicket[]>([]);
  const [sepaPayouts, setSepaPayouts] = useState<SepaPayoutItem[]>([]);
  const [safetyPendingCount, setSafetyPendingCount] = useState(0);
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [myCertifiedTrainingIds, setMyCertifiedTrainingIds] = useState<Set<string>>(new Set());
  const [followedClubIds, setFollowedClubIds] = useState<Set<string> | null>(null);
  const [events, setEvents] = useState<VolunteerEventData[]>([]);
  const [eventGroups, setEventGroups] = useState<VolunteerEventGroup[]>([]);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgramView[]>([]);
  const [loyaltyEnrollments, setLoyaltyEnrollments] = useState<Record<string, LoyaltyEnrollmentView>>({});
  const [enrollingProgram, setEnrollingProgram] = useState<string | null>(null);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [signingUp, setSigningUp] = useState<string | null>(null);

  // Sync profile from context
  useEffect(() => {
    if (contextProfile) {
      setProfile({ full_name: contextProfile.full_name, email: contextProfile.email, avatar_url: contextProfile.avatar_url });
    }
  }, [contextProfile]);

  // Main init
  useEffect(() => {
    const init = async () => {
      const uid = contextUserId || '';
      if (!uid) return;
      setCurrentUserId(uid);

      // Critical path
      const [tasksRes, signupsRes] = await Promise.all([
        supabase.from('tasks').select('*, clubs(name, sport, location)').eq('status', 'open').order('task_date', { ascending: true }),
        supabase.from('task_signups').select('task_id, status').eq('volunteer_id', uid),
      ]);

      if (!tasksRes.error && tasksRes.data) {
        setTasks(tasksRes.data);
        setSignups(signupsRes.data || []);
        setLoading(false);
      }

      if (contextProfile && !contextProfile.full_name) {
        setIsFirstLogin(true);
        setShowProfileDialog(true);
      }

      // Deferred path
      const [eventsRes, paymentsRes, sepaRes, contractsRes, ticketsRes, loyaltyRes, certsRes, followsRes] = await Promise.all([
        supabase.from('events').select('*').is('training_id', null).neq('event_type', 'training').neq('status', 'on_hold').order('event_date', { ascending: true }),
        supabase.from('volunteer_payments').select('id, task_id, amount, currency, status, paid_at, created_at').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('sepa_batch_items').select('id, amount, status, created_at, error_flag, error_message, batch_id, task_id, volunteer_id').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('signature_requests').select('id, task_id, status, signing_url, document_url, created_at, updated_at').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('volunteer_tickets').select('id, task_id, event_id, club_id, status, ticket_url, barcode, external_ticket_id, created_at, checked_in_at').eq('volunteer_id', uid).order('created_at', { ascending: false }),
        supabase.from('loyalty_programs').select('*').eq('is_active', true),
        supabase.from('volunteer_certificates').select('training_id').eq('volunteer_id', uid),
        supabase.from('club_follows').select('club_id').eq('user_id', uid),
      ]);

      // Task enrichment
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
        if (myLikeRes.data) setMyLikes(new Set(myLikeRes.data.map(l => l.task_id)));
      } else {
        setLoading(false);
      }

      // Events enrichment
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

      // Batch enrich payments, contracts, tickets, etc.
      const paymentsData = paymentsRes.data;
      const sepaItems = sepaRes.data;
      const contractsData = contractsRes.data;
      const ticketsData = ticketsRes.data;
      const allPrograms = loyaltyRes.data;

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

      const [enrichTasksRes, enrichClubsRes, enrichEventsRes, batchesRes, loyaltyEnrRes] = await Promise.all([
        enrichTaskIds.size > 0 ? supabase.from('tasks').select('id, title, club_id, clubs(name)').in('id', Array.from(enrichTaskIds)) : Promise.resolve({ data: [] as any[] }),
        enrichClubIds.size > 0 ? supabase.from('clubs').select('id, name').in('id', Array.from(enrichClubIds)) : Promise.resolve({ data: [] as any[] }),
        enrichEventIds.size > 0 ? supabase.from('events').select('id, title').in('id', Array.from(enrichEventIds)) : Promise.resolve({ data: [] as any[] }),
        batchIds.size > 0 ? supabase.from('sepa_batches').select('id, status, batch_reference, club_id').in('id', Array.from(batchIds)) : Promise.resolve({ data: [] as any[] }),
        programIds.length > 0 ? supabase.from('loyalty_enrollments').select('*').eq('volunteer_id', uid).in('program_id', programIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const taskEnrichMap = new Map((enrichTasksRes.data || []).map((t: any) => [t.id, t]));
      const clubEnrichMap = new Map((enrichClubsRes.data || []).map((c: any) => [c.id, c.name]));
      const eventEnrichMap = new Map((enrichEventsRes.data || []).map((e: any) => [e.id, e.title]));
      const batchMap = new Map((batchesRes.data || []).map((b: any) => [b.id, b]));

      if (paymentsData?.length) {
        setMyPayments(paymentsData.map((p: any) => {
          const t = taskEnrichMap.get(p.task_id);
          return { ...p, task_title: t?.title, club_name: t?.clubs?.name };
        }));
      }

      if (sepaItems?.length) {
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

      if (contractsData?.length) {
        setMyContracts(contractsData.map((c: any) => {
          const t = taskEnrichMap.get(c.task_id);
          return { ...c, task_title: t?.title, club_name: t?.clubs?.name };
        }));
      }

      if (ticketsData?.length) {
        setMyTickets(ticketsData.map((t: any) => ({
          ...t,
          club_name: clubEnrichMap.get(t.club_id) || '',
          task_title: t.task_id ? taskEnrichMap.get(t.task_id)?.title || '' : '',
          event_title: t.event_id ? eventEnrichMap.get(t.event_id) || '' : '',
        })));
      }

      if (allPrograms?.length) {
        setLoyaltyPrograms(allPrograms.map((p: any) => ({ ...p, club_name: clubEnrichMap.get(p.club_id) || '' })));
        if (loyaltyEnrRes.data) {
          const enrollMap: Record<string, LoyaltyEnrollmentView> = {};
          loyaltyEnrRes.data.forEach((e: any) => { enrollMap[e.program_id] = { id: e.id, tasks_completed: e.tasks_completed, points_earned: e.points_earned || 0, reward_claimed: e.reward_claimed }; });
          setLoyaltyEnrollments(enrollMap);
        }
      }

      if (certsRes.data) setMyCertifiedTrainingIds(new Set(certsRes.data.map((c: any) => c.training_id)));
      setFollowedClubIds(new Set(followsRes.data?.map((f: any) => f.club_id) || []));

      setLoading(false);

      // Compliance check
      const now = new Date();
      const complianceKey = `compliance-prompted-${now.getFullYear()}-${now.getMonth() + 1}`;
      if (!localStorage.getItem(complianceKey)) {
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const { data: existingDecls } = await supabase.from('compliance_declarations').select('id').eq('volunteer_id', uid).eq('declaration_year', prevYear).eq('declaration_month', prevMonth).limit(1);
        if (!existingDecls || existingDecls.length === 0) {
          setShowComplianceDialog(true);
          localStorage.setItem(complianceKey, 'true');
        }
      }
    };

    init();
  }, [contextUserId]);

  // Live event redirect
  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let channels: any[] = [];

    const fetchMyEventIds = async (): Promise<string[]> => {
      const { data: mySignups } = await supabase.from('task_signups').select('task_id').eq('volunteer_id', currentUserId);
      const taskIds = [...new Set((mySignups || []).map(s => s.task_id))];
      if (taskIds.length === 0) return [];
      const { data: myTasks } = await supabase.from('tasks').select('event_id').in('id', taskIds).not('event_id', 'is', null);
      return [...new Set((myTasks || []).map(t => t.event_id).filter(Boolean) as string[])];
    };

    const checkForLiveEvent = async (eventIds: string[]) => {
      if (!mounted || eventIds.length === 0) return;
      const { data: liveEvents } = await supabase.from('events').select('id').in('id', eventIds).eq('is_live', true).limit(1);
      if (!mounted) return;
      if (liveEvents?.[0]?.id) navigate(`/safety/${liveEvents[0].id}`);
    };

    const setup = async () => {
      const eventIds = await fetchMyEventIds();
      if (!mounted) return;
      await checkForLiveEvent(eventIds);
      if (eventIds.length > 0) {
        channels = eventIds.map(eventId =>
          supabase.channel(`volunteer-live-${currentUserId}-${eventId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload: any) => {
              if (payload.new?.is_live === true) navigate(`/safety/${eventId}`);
            })
            .subscribe()
        );
      }
      intervalId = setInterval(async () => {
        if (document.visibilityState === 'hidden') return;
        const refreshedIds = await fetchMyEventIds();
        await checkForLiveEvent(refreshedIds);
      }, 30000);
    };

    setup();
    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [currentUserId, navigate]);

  // Handlers
  const handleSignup = async (taskId: string) => {
    if (!currentUserId) return;
    setSigningUp(taskId);
    const { error } = await supabase.from('task_signups').insert({ task_id: taskId, volunteer_id: currentUserId });
    if (error) toast.error(error.message);
    else {
      toast.success(t.volunteer.step3Title + '!');
      setSignups(prev => [...prev, { task_id: taskId, status: 'pending' }]);
      setSignupCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
    }
    setSigningUp(null);
  };

  const handleCancelSignup = async (taskId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase.from('task_signups').delete().eq('task_id', taskId).eq('volunteer_id', currentUserId);
    if (error) toast.error(error.message);
    else {
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
      if (error.code === '23505') toast.info(language === 'nl' ? 'Je bent al ingeschreven!' : language === 'fr' ? 'Vous êtes déjà inscrit!' : 'You are already enrolled!');
      else toast.error(error.message);
    } else if (data) {
      toast.success(language === 'nl' ? 'Ingeschreven voor loyaliteitsprogramma!' : language === 'fr' ? 'Inscrit au programme de fidélité!' : 'Enrolled in loyalty program!');
      setLoyaltyEnrollments(prev => ({ ...prev, [programId]: { id: data.id, tasks_completed: 0, points_earned: 0, reward_claimed: false } }));
    }
    setEnrollingProgram(null);
  };

  const handleSignContract = (taskId: string, setActiveTab: (tab: string) => void) => {
    const contract = myContracts.find(c => c.task_id === taskId);
    if (contract) {
      if (contract.status === 'pending' && contract.signing_url) window.open(contract.signing_url, '_blank');
      else if (contract.status === 'completed' && contract.document_url) window.open(contract.document_url, '_blank');
      else setActiveTab('contracts');
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
        if (data.status === 'completed') toast.success(language === 'nl' ? 'Contract is ondertekend!' : language === 'fr' ? 'Contrat signé !' : 'Contract signed!');
        else toast.info(language === 'nl' ? 'Contract is nog in afwachting.' : language === 'fr' ? 'Contrat en attente.' : 'Contract still pending.');
      }
    } catch { toast.error(language === 'nl' ? 'Kon de status niet ophalen.' : language === 'fr' ? 'Impossible de récupérer le statut.' : 'Could not fetch status.'); }
    setCheckingContract(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const isSignedUp = (taskId: string) => signups.some(s => s.task_id === taskId);
  const getSignupStatus = (taskId: string) => signups.find(s => s.task_id === taskId)?.status || null;

  const pendingSignups = signups.filter(s => s.status === 'pending');
  const assignedSignups = signups.filter(s => s.status === 'assigned');

  return {
    // State
    tasks, signups, loading, currentUserId, profile, isFirstLogin, myPayments, myContracts,
    checkingContract, myTickets, sepaPayouts, safetyPendingCount, signupCounts, likeCounts,
    myLikes, myCertifiedTrainingIds, followedClubIds, events, eventGroups, loyaltyPrograms,
    loyaltyEnrollments, enrollingProgram, showComplianceDialog, showProfileDialog, signingUp,
    pendingSignups, assignedSignups,
    // Setters
    setProfile, setIsFirstLogin, setShowComplianceDialog, setShowProfileDialog, setSafetyPendingCount,
    // Handlers
    handleSignup, handleCancelSignup, handleLikeToggle, handleEnrollLoyalty,
    handleSignContract, handleCheckContractStatus, handleLogout, isSignedUp, getSignupStatus,
    // Context
    language, navigate, contextUserId,
  };
}
