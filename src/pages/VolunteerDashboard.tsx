import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, LogOut, Search, CheckCircle, Heart, MessageCircle, FileSignature, User, CreditCard, Clock, AlertTriangle, Download, ClipboardList, CalendarDays, Timer, Gift, Ticket } from 'lucide-react';
import HourConfirmationDialog from '@/components/HourConfirmationDialog';
import Logo from '@/components/Logo';
import LikeButton from '@/components/LikeButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import EditProfileDialog from '@/components/EditProfileDialog';
import { Language } from '@/i18n/translations';
import { VolunteerBriefingsList } from '@/components/VolunteerBriefingView';
import MonthlyComplianceDialog from '@/components/MonthlyComplianceDialog';
import ComplianceBadge from '@/components/ComplianceBadge';
import { useComplianceData } from '@/hooks/useComplianceData';
import EventDetailDialog from '@/components/EventDetailDialog';

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
  clubs?: { name: string; sport: string | null; location: string | null };
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

const langLabels: Record<Language, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

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
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'payments' | 'contracts' | 'briefings' | 'loyalty' | 'tickets'>('all');
  const [mineSubTab, setMineSubTab] = useState<'pending' | 'assigned'>('pending');
  const [_signingContract, _setSigningContract] = useState<string | null>(null);
  const [myPayments, setMyPayments] = useState<VolunteerPayment[]>([]);
  const [myContracts, setMyContracts] = useState<SignatureContract[]>([]);
  const [checkingContract, setCheckingContract] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<VolunteerTicket[]>([]);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  // Events state
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  // Loyalty state
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<{ id: string; name: string; description: string | null; reward_description: string; required_tasks: number; required_points: number | null; points_based: boolean; club_id: string; club_name?: string }[]>([]);
  const [loyaltyEnrollments, setLoyaltyEnrollments] = useState<Record<string, { id: string; tasks_completed: number; points_earned: number; reward_claimed: boolean }>>({});
  const [enrollingProgram, setEnrollingProgram] = useState<string | null>(null);

  const { data: complianceData } = useComplianceData(currentUserId || null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, phone, bio')
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
        // Enrich with event_id/event_group_id
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

      // Fetch ALL events (always, regardless of tasks)
      const { data: allEventsData } = await (supabase as any).from('events').select('*').order('event_date', { ascending: true });
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
          ...t,
          club_name: clubMap2.get(t.club_id) || '',
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

        // Fetch my enrollments
        const programIds = allPrograms.map((p: any) => p.id);
        const { data: myEnrollments } = await (supabase as any).from('loyalty_enrollments').select('*').eq('volunteer_id', session.user.id).in('program_id', programIds);
        if (myEnrollments) {
          const enrollMap: Record<string, { id: string; tasks_completed: number; points_earned: number; reward_claimed: boolean }> = {};
          myEnrollments.forEach((e: any) => { enrollMap[e.program_id] = { id: e.id, tasks_completed: e.tasks_completed, points_earned: e.points_earned || 0, reward_claimed: e.reward_claimed }; });
          setLoyaltyEnrollments(enrollMap);
        }
      }

      setLoading(false);

      // Check compliance
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const { data: existingDecls } = await supabase.from('compliance_declarations').select('id').eq('volunteer_id', session.user.id).eq('declaration_year', prevYear).eq('declaration_month', prevMonth).limit(1);
      if (!existingDecls || existingDecls.length === 0) { setShowComplianceDialog(true); }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { if (!session) navigate('/login'); });
    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

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
      toast.info(language === 'nl' ? 'Het contract is nog niet verstuurd door de club. Neem contact op met je club.' : language === 'fr' ? 'Le contrat n\'a pas encore été envoyé par le club. Contactez votre club.' : 'The contract has not been sent by the club yet. Contact your club.');
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
        if (data.status === 'completed') { toast.success('Contract is ondertekend! Je kunt het nu downloaden.'); } else { toast.info('Contract is nog in afwachting van ondertekening.'); }
      }
    } catch { toast.error('Kon de status niet ophalen.'); }
    setCheckingContract(null);
  };

  // Derived data
  const looseTasks = tasks.filter(t => !t.event_id);
  const eventTasks = tasks.filter(t => t.event_id);

  const filteredLooseTasks = looseTasks.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q) || task.clubs?.name.toLowerCase().includes(q) || task.clubs?.sport?.toLowerCase().includes(q) || task.location?.toLowerCase().includes(q);
    if (activeTab === 'mine') {
      const status = getSignupStatus(task.id);
      if (!status) return false;
      return matchesSearch && status === mineSubTab;
    }
    return matchesSearch;
  });

  const filteredEvents = events.filter(event => {
    if (activeTab === 'mine') {
      // Show events that have tasks user is signed up for
      const evTasks = tasks.filter(t => t.event_id === event.id);
      return evTasks.some(t => {
        const status = getSignupStatus(t.id);
        return status === mineSubTab;
      });
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const matchesEvent = event.title.toLowerCase().includes(q) || event.location?.toLowerCase().includes(q) || event.club_name?.toLowerCase().includes(q);
    const evTasks = tasks.filter(t => t.event_id === event.id);
    const matchesTask = evTasks.some(t => t.title.toLowerCase().includes(q));
    return matchesEvent || matchesTask;
  });

  const dashboardT = {
    nl: { welcome: 'Welkom', availableTasks: 'Beschikbare taken', searchPlaceholder: 'Zoek taken, evenementen, clubs of locaties...', noTasks: 'Er zijn momenteel geen openstaande taken.', signUp: 'Inschrijven', signedUp: 'Ingeschreven', assigned: 'Toegekend', cancel: 'Annuleren', spots: 'plaatsen', logout: 'Uitloggen', mySignups: 'Mijn inschrijvingen', allTasks: 'Alle taken', myTasks: 'Mijn taken', noMyTasks: 'Geen taken in deze categorie.', signContract: 'Contract ondertekenen', signing: 'Laden...', ingeschreven: 'Ingeschreven', toegekend: 'Toegekend', payments: 'Vergoedingen', noPayments: 'Je hebt nog geen vergoedingen ontvangen.', paid: 'Betaald', processing: 'Verwerken', pending: 'In afwachting', failed: 'Mislukt', receipt: 'Betaalbewijs', paidOn: 'Betaald op', contracts: 'Contracten', noContracts: 'Je hebt nog geen contracten.', signed: 'Ondertekend', awaitingSignature: 'Wacht op ondertekening', signNow: 'Nu ondertekenen', downloadContract: 'Download contract', checkStatus: 'Status ophalen', sentOn: 'Verstuurd op', events: 'Evenementen', looseTasks: 'Overige taken', viewEvent: 'Bekijk evenement' },
    fr: { welcome: 'Bienvenue', availableTasks: 'Tâches disponibles', searchPlaceholder: 'Rechercher des tâches, événements, clubs ou lieux...', noTasks: 'Il n\'y a actuellement aucune tâche disponible.', signUp: 'S\'inscrire', signedUp: 'Inscrit', assigned: 'Attribué', cancel: 'Annuler', spots: 'places', logout: 'Déconnexion', mySignups: 'Mes inscriptions', allTasks: 'Toutes les tâches', myTasks: 'Mes tâches', noMyTasks: 'Aucune tâche dans cette catégorie.', signContract: 'Signer le contrat', signing: 'Chargement...', ingeschreven: 'Inscrits', toegekend: 'Attribués', payments: 'Remboursements', noPayments: 'Aucun remboursement reçu.', paid: 'Payé', processing: 'En cours', pending: 'En attente', failed: 'Échoué', receipt: 'Reçu', paidOn: 'Payé le', contracts: 'Contrats', noContracts: 'Aucun contrat.', signed: 'Signé', awaitingSignature: 'En attente de signature', signNow: 'Signer maintenant', downloadContract: 'Télécharger le contrat', checkStatus: 'Vérifier le statut', sentOn: 'Envoyé le', events: 'Événements', looseTasks: 'Autres tâches', viewEvent: "Voir l'événement" },
    en: { welcome: 'Welcome', availableTasks: 'Available tasks', searchPlaceholder: 'Search tasks, events, clubs or locations...', noTasks: 'There are currently no open tasks.', signUp: 'Sign up', signedUp: 'Signed up', assigned: 'Assigned', cancel: 'Cancel', spots: 'spots', logout: 'Log out', mySignups: 'My signups', allTasks: 'All tasks', myTasks: 'My tasks', noMyTasks: 'No tasks in this category.', signContract: 'Sign contract', signing: 'Loading...', ingeschreven: 'Signed up', toegekend: 'Assigned', payments: 'Reimbursements', noPayments: 'No reimbursements received yet.', paid: 'Paid', processing: 'Processing', pending: 'Pending', failed: 'Failed', receipt: 'Receipt', paidOn: 'Paid on', contracts: 'Contracts', noContracts: 'No contracts yet.', signed: 'Signed', awaitingSignature: 'Awaiting signature', signNow: 'Sign now', downloadContract: 'Download contract', checkStatus: 'Check status', sentOn: 'Sent on', events: 'Events', looseTasks: 'Other tasks', viewEvent: 'View event' },
  };
  const dt = dashboardT[language];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Get groups for selected event
  const selectedEventGroups = selectedEvent
    ? eventGroups.filter(g => g.event_id === selectedEvent.id).map(g => ({
        ...g,
        tasks: tasks.filter(t => t.event_group_id === g.id),
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {(['nl', 'fr', 'en'] as Language[]).map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)} className={`px-2 py-1 text-xs rounded-md transition-colors ${language === lang ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                  {langLabels[lang]}
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/chat')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" title={dt.allTasks}>
              <MessageCircle className="w-4 h-4" />
            </button>
            <button onClick={() => setShowProfileDialog(true)} className="relative group" title="Mijn profiel">
              <Avatar className="w-8 h-8">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />}
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{(profile?.full_name || profile?.email || '?')[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
            <span className="text-sm text-muted-foreground hidden md:block">{profile?.full_name || profile?.email}</span>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{dt.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-foreground">{dt.welcome}, {profile?.full_name || profile?.email || ''}! 👋</h1>
          <p className="text-muted-foreground mt-1">{dt.availableTasks}: {tasks.length}</p>
        </motion.div>

        {/* Filter bar */}
        <div className="mt-6 bg-card rounded-2xl shadow-card border border-transparent p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder={dt.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border-0" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('all')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${activeTab === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>{dt.allTasks}</button>
            <button onClick={() => { setActiveTab('mine'); setMineSubTab('pending'); }} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'mine' && mineSubTab === 'pending' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              {dt.ingeschreven} {pendingSignups.length > 0 && <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${activeTab === 'mine' && mineSubTab === 'pending' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{pendingSignups.length}</span>}
            </button>
            <button onClick={() => { setActiveTab('mine'); setMineSubTab('assigned'); }} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'mine' && mineSubTab === 'assigned' ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <CheckCircle className="w-3 h-3" /> {dt.toegekend} {assignedSignups.length > 0 && <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${activeTab === 'mine' && mineSubTab === 'assigned' ? 'bg-accent-foreground/20 text-accent-foreground' : 'bg-accent/10 text-accent'}`}>{assignedSignups.length}</span>}
            </button>
            <button onClick={() => setActiveTab('payments')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'payments' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <CreditCard className="w-3 h-3" /> {dt.payments} {myPayments.length > 0 && <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${activeTab === 'payments' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{myPayments.length}</span>}
            </button>
            <button onClick={() => setActiveTab('contracts')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'contracts' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <FileSignature className="w-3 h-3" /> {dt.contracts} {myContracts.length > 0 && <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${activeTab === 'contracts' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{myContracts.length}</span>}
            </button>
            <button onClick={() => setActiveTab('briefings')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'briefings' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <ClipboardList className="w-3 h-3" /> Briefings
            </button>
            <button onClick={() => setActiveTab('loyalty')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'loyalty' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <Gift className="w-3 h-3" /> {language === 'nl' ? 'Loyaliteit' : language === 'fr' ? 'Fidélité' : 'Loyalty'} {loyaltyPrograms.length > 0 && <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${activeTab === 'loyalty' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{loyaltyPrograms.length}</span>}
            </button>
            <button onClick={() => setActiveTab('tickets')} className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${activeTab === 'tickets' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <Ticket className="w-3 h-3" /> Tickets {myTickets.length > 0 && <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${activeTab === 'tickets' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{myTickets.length}</span>}
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'tickets' ? (
          <div className="mt-6 space-y-4">
            {myTickets.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{language === 'nl' ? 'Je hebt nog geen tickets.' : language === 'fr' ? 'Vous n\'avez pas encore de tickets.' : 'No tickets yet.'}</p></div>
            ) : (
              myTickets.map((ticket, i) => (
                <motion.div key={ticket.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-card rounded-2xl overflow-hidden shadow-card border ${ticket.status === 'checked_in' ? 'border-accent/30' : ticket.status === 'sent' ? 'border-primary/30' : 'border-transparent'}`}>
                  {/* Ticket header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ticket.task_title || ticket.event_title || 'Ticket'}</p>
                        {ticket.club_name && <p className="text-xs text-muted-foreground mt-0.5">{ticket.club_name}</p>}
                      </div>
                      <div className="shrink-0">
                        {ticket.status === 'checked_in' ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent-foreground"><CheckCircle className="w-3.5 h-3.5" />{language === 'nl' ? 'Ingecheckt' : language === 'fr' ? 'Enregistré' : 'Checked in'}</span>
                        ) : ticket.status === 'sent' ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary"><Ticket className="w-3.5 h-3.5" />{language === 'nl' ? 'Geldig' : language === 'fr' ? 'Valide' : 'Valid'}</span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground"><Clock className="w-3.5 h-3.5" />{language === 'nl' ? 'In afwachting' : language === 'fr' ? 'En attente' : 'Pending'}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{language === 'nl' ? 'Aangemaakt op' : language === 'fr' ? 'Créé le' : 'Created on'}: {new Date(ticket.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    {ticket.checked_in_at && <p className="text-xs text-accent-foreground mt-1">{language === 'nl' ? 'Ingecheckt op' : language === 'fr' ? 'Enregistré le' : 'Checked in at'}: {new Date(ticket.checked_in_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                  {/* Barcode / ticket body - always shown */}
                  {ticket.barcode && (
                    <>
                      <div className="border-t border-dashed border-border mx-3" />
                      <div className="p-5 pt-3 flex flex-col items-center gap-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{language === 'nl' ? 'Toon deze code bij het inchecken' : language === 'fr' ? 'Montrez ce code à l\'entrée' : 'Show this code at check-in'}</p>
                        <div className="bg-foreground/5 rounded-xl px-6 py-3 flex flex-col items-center gap-1">
                          <span className="text-lg font-mono font-bold tracking-widest text-foreground">{ticket.barcode}</span>
                          <span className="text-[10px] text-muted-foreground">ID: {ticket.external_ticket_id?.slice(-12) || ticket.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))
            )}
          </div>
        ) : activeTab === 'loyalty' ? (
          <div className="mt-6 space-y-4">
            {loyaltyPrograms.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Gift className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{language === 'nl' ? 'Geen loyaliteitsprogramma\'s beschikbaar.' : language === 'fr' ? 'Aucun programme de fidélité disponible.' : 'No loyalty programs available.'}</p></div>
            ) : (
              loyaltyPrograms.map((program, i) => {
                const enrollment = loyaltyEnrollments[program.id];
                const isPointsBased = program.points_based && program.required_points;
                const progress = enrollment ? (isPointsBased ? Math.min(100, (enrollment.points_earned / (program.required_points || 1)) * 100) : Math.min(100, (enrollment.tasks_completed / program.required_tasks) * 100)) : 0;
                const goalReached = enrollment ? (isPointsBased ? enrollment.points_earned >= (program.required_points || 0) : enrollment.tasks_completed >= program.required_tasks) : false;
                return (
                  <motion.div key={program.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl p-5 shadow-card border border-transparent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-primary" />
                          <h3 className="font-heading font-semibold text-foreground">{program.name}</h3>
                          {isPointsBased && <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">{language === 'nl' ? 'Punten' : language === 'fr' ? 'Points' : 'Points'}</span>}
                        </div>
                        {program.club_name && <p className="text-xs text-muted-foreground mt-0.5">{program.club_name}</p>}
                        {program.description && <p className="text-sm text-muted-foreground mt-1">{program.description}</p>}
                        <p className="text-sm mt-2">🎁 {program.reward_description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isPointsBased
                            ? `${program.required_points} ${language === 'nl' ? 'punten vereist' : language === 'fr' ? 'points requis' : 'points required'}`
                            : `${program.required_tasks} ${language === 'nl' ? 'taken vereist' : language === 'fr' ? 'tâches requises' : 'tasks required'}`}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {!enrollment ? (
                          <button onClick={() => handleEnrollLoyalty(program.id)} disabled={enrollingProgram === program.id} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                            {enrollingProgram === program.id ? '...' : language === 'nl' ? 'Deelnemen' : language === 'fr' ? 'Participer' : 'Join'}
                          </button>
                        ) : enrollment.reward_claimed ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-accent/20 text-accent-foreground">✅ {language === 'nl' ? 'Beloning ontvangen' : language === 'fr' ? 'Récompense reçue' : 'Reward received'}</span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                            {isPointsBased ? `${enrollment.points_earned}/${program.required_points}` : `${enrollment.tasks_completed}/${program.required_tasks}`}
                          </span>
                        )}
                      </div>
                    </div>
                    {enrollment && (
                      <div className="mt-3">
                        <div className="bg-muted rounded-full h-2 w-full">
                          <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        ) : activeTab === 'briefings' ? (
          <div className="mt-6"><VolunteerBriefingsList language={language} userId={currentUserId} /></div>
        ) : activeTab === 'contracts' ? (
          <div className="mt-6 space-y-4">
            {myContracts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{dt.noContracts}</p></div>
            ) : (
              myContracts.map((contract, i) => (
                <motion.div key={contract.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-card rounded-2xl p-5 shadow-card border ${contract.status === 'completed' ? 'border-green-200 dark:border-green-800' : 'border-transparent'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{contract.task_title || 'Contract'}</p>
                      {contract.club_name && <p className="text-xs text-muted-foreground">{contract.club_name}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {contract.status === 'completed' ? <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"><CheckCircle className="w-3.5 h-3.5" />{dt.signed}</span> : <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400"><Clock className="w-3.5 h-3.5" />{dt.awaitingSignature}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {contract.status === 'pending' && contract.signing_url && <a href={contract.signing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"><FileSignature className="w-3.5 h-3.5" />{dt.signNow}</a>}
                      {contract.status === 'pending' && <button onClick={() => handleCheckContractStatus(contract.id)} disabled={checkingContract === contract.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">{checkingContract === contract.id ? <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /> : <Clock className="w-3 h-3" />}{dt.checkStatus}</button>}
                      {contract.status === 'completed' && contract.document_url && <a href={contract.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"><Download className="w-3.5 h-3.5" />{dt.downloadContract}</a>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{dt.sentOn}: {new Date(contract.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </motion.div>
              ))
            )}
          </div>
        ) : activeTab === 'payments' ? (
          <div className="mt-6 space-y-4">
            {myPayments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{dt.noPayments}</p></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-2xl shadow-card border border-transparent p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{dt.paid}</p>
                    <p className="text-2xl font-heading font-bold text-green-600 mt-1">€{myPayments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-card border border-transparent p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{dt.processing}</p>
                    <p className="text-2xl font-heading font-bold text-primary mt-1">€{myPayments.filter(p => p.status === 'processing').reduce((s, p) => s + p.amount, 0).toFixed(2)}</p>
                  </div>
                </div>
                {myPayments.map((payment, i) => (
                  <motion.div key={payment.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-card rounded-2xl p-5 shadow-card border ${payment.status === 'succeeded' ? 'border-green-200' : 'border-transparent'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{payment.task_title || 'Taak'}</p>
                        {payment.club_name && <p className="text-xs text-muted-foreground">{payment.club_name}</p>}
                        <p className="text-lg font-heading font-bold text-foreground mt-1">€{payment.amount.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 text-xs">
                          {payment.status === 'succeeded' ? <CheckCircle className="w-4 h-4 text-green-600" /> : payment.status === 'processing' ? <Clock className="w-4 h-4 text-yellow-600" /> : payment.status === 'failed' ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                          <span className="font-medium">{payment.status === 'succeeded' ? dt.paid : payment.status === 'processing' ? dt.processing : payment.status === 'failed' ? dt.failed : dt.pending}</span>
                        </div>
                        {payment.stripe_receipt_url && <a href={payment.stripe_receipt_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title={dt.receipt}><Download className="w-3.5 h-3.5 text-muted-foreground" /></a>}
                      </div>
                    </div>
                    {payment.paid_at && <p className="text-xs text-muted-foreground mt-2">{dt.paidOn}: {new Date(payment.paid_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </motion.div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Events section */}
            {filteredEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> {dt.events}
                </h2>
                <div className="space-y-3">
                  {filteredEvents.map((event, i) => {
                    const evTasks = tasks.filter(t => t.event_id === event.id);
                    const totalSpots = evTasks.reduce((s, t) => s + t.spots_available, 0);
                    const totalSignups = evTasks.reduce((s, t) => s + (signupCounts[t.id] || 0), 0);
                    const myEventSignups = evTasks.filter(t => isSignedUp(t.id)).length;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedEvent(event)}
                        className={`bg-card rounded-2xl p-5 shadow-card border transition-all cursor-pointer hover:shadow-elevated ${
                          myEventSignups > 0 ? 'border-primary/30 bg-primary/5' : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CalendarDays className="w-4 h-4 text-primary" />
                              {event.club_name && <span className="text-xs text-muted-foreground">{event.club_name}</span>}
                            </div>
                            <h3 className="font-heading font-semibold text-foreground text-lg">{event.title}</h3>
                            {event.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{event.description}</p>}
                            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                              {event.event_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
                              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{totalSignups}/{totalSpots} {dt.spots}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            {myEventSignups > 0 && (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-primary/30 text-primary bg-primary/5">
                                {myEventSignups} {dt.signedUp.toLowerCase()}
                              </span>
                            )}
                            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">
                              {dt.viewEvent} →
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Loose tasks */}
            {(filteredLooseTasks.length > 0 || (filteredEvents.length === 0 && filteredLooseTasks.length === 0)) && (
              <div>
                {filteredEvents.length > 0 && (
                  <h2 className="text-lg font-heading font-semibold text-foreground mb-3">{dt.looseTasks}</h2>
                )}
                <div className="space-y-4">
                  {filteredLooseTasks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{activeTab === 'mine' ? dt.noMyTasks : dt.noTasks}</p>
                    </div>
                  ) : (
                    filteredLooseTasks.map((task, i) => {
                      const signed = isSignedUp(task.id);
                      const signupStatus = getSignupStatus(task.id);
                      const isAssigned = signupStatus === 'assigned';
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/task/${task.id}`)}
                          className={`bg-card rounded-2xl p-5 shadow-card border transition-all cursor-pointer ${isAssigned ? 'border-accent/30 bg-accent/5' : signed ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:shadow-elevated'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{task.clubs?.sport || task.clubs?.name}</span>
                                {task.clubs?.name && <span className="text-xs text-muted-foreground">{task.clubs.name}</span>}
                              </div>
                              <h3 className="font-heading font-semibold text-foreground">{task.title}</h3>
                              {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                                {task.task_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                                {(task.location || task.clubs?.location) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location || task.clubs?.location}</span>}
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{signupCounts[task.id] || 0}/{task.spots_available} {dt.spots}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <LikeButton taskId={task.id} liked={myLikes.has(task.id)} count={likeCounts[task.id] || 0} onToggle={handleLikeToggle} />
                                {isAssigned ? (
                                  <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-accent/30 text-accent bg-accent/5 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {dt.assigned}</span>
                                ) : signed ? (
                                  <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/30 text-primary bg-primary/5">✓ {dt.signedUp}</span>
                                ) : (
                                  <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">{dt.signUp} →</span>
                                )}
                              </div>
                              {isAssigned && (
                                <button onClick={(e) => { e.stopPropagation(); handleSignContract(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                                  <FileSignature className="w-3.5 h-3.5" />
                                  {myContracts.some(c => c.task_id === task.id && c.status === 'pending') ? dt.signContract : myContracts.some(c => c.task_id === task.id && c.status === 'completed') ? dt.downloadContract : dt.signContract}
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
            )}
          </div>
        )}
      </main>

      {/* Event detail dialog */}
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
    </div>
  );
};

export default VolunteerDashboard;
