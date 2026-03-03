import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import MonthlyPlanningKPIs from '@/components/MonthlyPlanningKPIs';
import { Users, Calendar, MapPin, LogOut, CheckCircle, Clock, ChevronDown, ChevronUp, Plus, X, Settings, Shield, FileText, CreditCard, Send, Loader2, AlertTriangle, Download, Bell, FileSignature, Pencil, Trash2, User, MessageCircle, ClipboardList, Eye, CalendarDays, Layers, Timer, Copy, Gift, Star, Ticket, Handshake, BarChart3 } from 'lucide-react';
import HourConfirmationDialog from '@/components/HourConfirmationDialog';
import DashboardLayout from '@/components/DashboardLayout';
import ClubOwnerSidebar from '@/components/ClubOwnerSidebar';

import ClubSettingsDialog from '@/components/ClubSettingsDialog';
import ClubMembersDialog from '@/components/ClubMembersDialog';
import NotificationBell from '@/components/NotificationBell';
import ContractTemplatesDialog from '@/components/ContractTemplatesDialog';
import VolunteerProfileDialog from '@/components/VolunteerProfileDialog';
import SendContractConfirmDialog from '@/components/SendContractConfirmDialog';
import BulkMessageDialog from '@/components/BulkMessageDialog';
import BriefingProgressDialog from '@/components/BriefingProgressDialog';
import TaskPickerDialog from '@/components/TaskPickerDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import EditProfileDialog from '@/components/EditProfileDialog';
import ComplianceBadge from '@/components/ComplianceBadge';
import { fetchBatchComplianceData, ComplianceStatus } from '@/hooks/useComplianceData';
import { Language } from '@/i18n/translations';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface VolunteerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at?: string;
  phone?: string | null;
  bio?: string | null;
  bank_iban?: string | null;
  bank_holder_name?: string | null;
  bank_consent_given?: boolean;
  bank_consent_date?: string | null;
}

interface Signup {
  id: string;
  task_id: string;
  volunteer_id: string;
  status: string;
  signed_up_at: string;
  volunteer?: VolunteerProfile | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  status: string;
  club_id?: string;
  contract_template_id?: string | null;
  contract_templates?: { name: string } | null;
  event_id?: string | null;
  event_group_id?: string | null;
  compensation_type?: string;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
  partner_only?: boolean;
  assigned_partner_id?: string | null;
}

interface EventData {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  created_at: string;
}

interface EventGroup {
  id: string;
  event_id: string;
  name: string;
  color: string;
  sort_order: number;
}

const GROUP_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const dashboardT = {
  nl: {
    title: 'Club Dashboard',
    myTasks: 'Mijn taken',
    noTasks: 'Je hebt nog geen taken aangemaakt.',
    signups: 'Aanmeldingen',
    noSignups: 'Geen aanmeldingen voor deze taak.',
    pending: 'In afwachting',
    assigned: 'Toegekend',
    assign: 'Toekennen',
    unassign: 'Intrekken',
    logout: 'Uitloggen',
    spots: 'plaatsen',
    volunteers: 'vrijwilligers',
    newTask: 'Nieuwe losse taak',
    newEvent: 'Nieuw evenement',
    taskTitle: 'Titel',
    taskDescription: 'Beschrijving',
    taskDate: 'Datum',
    taskLocation: 'Locatie',
    taskSpots: 'Aantal plaatsen',
    taskBriefingTime: 'Briefing tijd',
    taskBriefingLocation: 'Briefing locatie',
    taskStartTime: 'Starttijd',
    taskEndTime: 'Eindtijd',
    taskNotes: 'Notities',
    taskExpenseReimbursement: 'Onkostenvergoeding',
    taskExpenseAmount: 'Bedrag (€)',
    create: 'Aanmaken',
    creating: 'Bezig...',
    cancel: 'Annuleren',
    taskCreated: 'Taak succesvol aangemaakt!',
    eventCreated: 'Evenement succesvol aangemaakt!',
    contractTemplate: 'Contractsjabloon',
    selectTemplate: 'Selecteer een sjabloon...',
    noTemplatesYet: 'Nog geen sjablonen. Maak er eerst een aan.',
    manageTemplates: 'Sjablonen beheren',
    editTask: 'Taak bewerken',
    save: 'Opslaan',
    saving: 'Opslaan...',
    taskUpdated: 'Taak succesvol bijgewerkt!',
    deleteTask: 'Taak verwijderen',
    deleteConfirm: 'Weet je zeker dat je deze taak wilt verwijderen?',
    taskDeleted: 'Taak verwijderd!',
    delete: 'Verwijderen',
    events: 'Evenementen',
    looseTasks: 'Losse taken',
    addGroup: 'Groep toevoegen',
    groupName: 'Groepsnaam',
    addTaskToGroup: 'Taak toevoegen',
    noEvents: 'Nog geen evenementen aangemaakt.',
    eventTitle: 'Evenementtitel',
    eventDescription: 'Beschrijving',
    eventDate: 'Datum evenement',
    eventLocation: 'Locatie',
    deleteEvent: 'Evenement verwijderen',
    deleteEventConfirm: 'Weet je zeker dat je dit evenement wilt verwijderen? Alle groepen en taken worden ook verwijderd.',
    eventDeleted: 'Evenement verwijderd!',
    groupDeleted: 'Groep verwijderd!',
    groupCreated: 'Groep aangemaakt!',
    editEvent: 'Evenement bewerken',
    eventUpdated: 'Evenement bijgewerkt!',
    duplicateEvent: 'Evenement dupliceren',
    eventDuplicated: 'Evenement gedupliceerd!',
    duplicating: 'Dupliceren...',
  },
  fr: {
    title: 'Tableau de bord Club',
    myTasks: 'Mes tâches',
    noTasks: "Vous n'avez pas encore créé de tâches.",
    signups: 'Inscriptions',
    noSignups: "Aucune inscription pour cette tâche.",
    pending: 'En attente',
    assigned: 'Attribué',
    assign: 'Attribuer',
    unassign: 'Révoquer',
    logout: 'Déconnexion',
    spots: 'places',
    volunteers: 'bénévoles',
    newTask: 'Nouvelle tâche libre',
    newEvent: 'Nouvel événement',
    taskTitle: 'Titre',
    taskDescription: 'Description',
    taskDate: 'Date',
    taskLocation: 'Lieu',
    taskSpots: 'Nombre de places',
    taskBriefingTime: 'Heure de briefing',
    taskBriefingLocation: 'Lieu de briefing',
    taskStartTime: 'Heure de début',
    taskEndTime: 'Heure de fin',
    taskNotes: 'Notes',
    taskExpenseReimbursement: 'Remboursement des frais',
    taskExpenseAmount: 'Montant (€)',
    create: 'Créer',
    creating: 'En cours...',
    cancel: 'Annuler',
    taskCreated: 'Tâche créée avec succès!',
    eventCreated: 'Événement créé avec succès!',
    contractTemplate: 'Modèle de contrat',
    selectTemplate: 'Sélectionnez un modèle...',
    noTemplatesYet: "Aucun modèle. Créez-en un d'abord.",
    manageTemplates: 'Gérer les modèles',
    editTask: 'Modifier la tâche',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    taskUpdated: 'Tâche mise à jour avec succès!',
    deleteTask: 'Supprimer la tâche',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette tâche?',
    taskDeleted: 'Tâche supprimée!',
    delete: 'Supprimer',
    events: 'Événements',
    looseTasks: 'Tâches libres',
    addGroup: 'Ajouter un groupe',
    groupName: 'Nom du groupe',
    addTaskToGroup: 'Ajouter une tâche',
    noEvents: "Aucun événement créé.",
    eventTitle: "Titre de l'événement",
    eventDescription: 'Description',
    eventDate: "Date de l'événement",
    eventLocation: 'Lieu',
    deleteEvent: "Supprimer l'événement",
    deleteEventConfirm: "Êtes-vous sûr de vouloir supprimer cet événement? Tous les groupes et tâches seront supprimés.",
    eventDeleted: 'Événement supprimé!',
    groupDeleted: 'Groupe supprimé!',
    groupCreated: 'Groupe créé!',
    editEvent: "Modifier l'événement",
    eventUpdated: 'Événement mis à jour!',
    duplicateEvent: "Dupliquer l'événement",
    eventDuplicated: 'Événement dupliqué!',
    duplicating: 'Duplication...',
  },
  en: {
    title: 'Club Dashboard',
    myTasks: 'My tasks',
    noTasks: "You haven't created any tasks yet.",
    signups: 'Signups',
    noSignups: 'No signups for this task.',
    pending: 'Pending',
    assigned: 'Assigned',
    assign: 'Assign',
    unassign: 'Unassign',
    logout: 'Log out',
    spots: 'spots',
    volunteers: 'volunteers',
    newTask: 'New loose task',
    newEvent: 'New event',
    taskTitle: 'Title',
    taskDescription: 'Description',
    taskDate: 'Date',
    taskLocation: 'Location',
    taskSpots: 'Available spots',
    taskBriefingTime: 'Briefing time',
    taskBriefingLocation: 'Briefing location',
    taskStartTime: 'Start time',
    taskEndTime: 'End time',
    taskNotes: 'Notes',
    taskExpenseReimbursement: 'Expense reimbursement',
    taskExpenseAmount: 'Amount (€)',
    create: 'Create',
    creating: 'Creating...',
    cancel: 'Cancel',
    taskCreated: 'Task created successfully!',
    eventCreated: 'Event created successfully!',
    contractTemplate: 'Contract template',
    selectTemplate: 'Select a template...',
    noTemplatesYet: 'No templates yet. Create one first.',
    manageTemplates: 'Manage templates',
    editTask: 'Edit task',
    save: 'Save',
    saving: 'Saving...',
    taskUpdated: 'Task updated successfully!',
    deleteTask: 'Delete task',
    deleteConfirm: 'Are you sure you want to delete this task?',
    taskDeleted: 'Task deleted!',
    delete: 'Delete',
    events: 'Events',
    looseTasks: 'Loose tasks',
    addGroup: 'Add group',
    groupName: 'Group name',
    addTaskToGroup: 'Add task',
    noEvents: 'No events created yet.',
    eventTitle: 'Event title',
    eventDescription: 'Description',
    eventDate: 'Event date',
    eventLocation: 'Location',
    deleteEvent: 'Delete event',
    deleteEventConfirm: 'Are you sure you want to delete this event? All groups and tasks will also be deleted.',
    eventDeleted: 'Event deleted!',
    groupDeleted: 'Group deleted!',
    groupCreated: 'Group created!',
    editEvent: 'Edit event',
    eventUpdated: 'Event updated!',
    duplicateEvent: 'Duplicate event',
    eventDuplicated: 'Event duplicated!',
    duplicating: 'Duplicating...',
  },
};

const ClubOwnerDashboard = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dt = dashboardT[language];

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [signups, setSignups] = useState<Record<string, Signup[]>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [updatingSignup, setUpdatingSignup] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<{ name: string; sport: string | null; location: string | null; logo_url: string | null } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [myClubRole, setMyClubRole] = useState<'bestuurder' | 'beheerder' | 'medewerker'>('medewerker');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<{ volunteer: VolunteerProfile; signupStatus: string; signedUpAt: string } | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [contractTemplates, setContractTemplates] = useState<{ id: string; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [volunteerPayments, setVolunteerPayments] = useState<Record<string, { status: string; receipt_url?: string | null; paid_at?: string | null }>>({});
  const [signatureStatuses, setSignatureStatuses] = useState<Record<string, { status: string; document_url?: string | null; id?: string }>>({});
  const [volunteerStripeIds, setVolunteerStripeIds] = useState<Record<string, string | null>>({});
  const [clubStripeId, setClubStripeId] = useState<string | null>(null);
  const [sendingPayment, setSendingPayment] = useState<string | null>(null);
  const [sendingContract, setSendingContract] = useState<string | null>(null);
  const [contractConfirm, setContractConfirm] = useState<{ volunteer: Signup['volunteer']; task: Task } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', task_date: '', location: '', spots_available: 1,
    briefing_time: '', briefing_location: '', start_time: '', end_time: '',
    notes: '', expense_reimbursement: false, expense_amount: '', contract_template_id: '',
    compensation_type: 'fixed' as string, hourly_rate: '', estimated_hours: '',
  });
  const [hourConfirmOpen, setHourConfirmOpen] = useState<{ taskId: string; volunteerId: string; volunteerName: string; hourlyRate: number; estimatedHours: number } | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [bulkMessageTask, setBulkMessageTask] = useState<{ taskId: string; taskTitle: string; volunteers: { id: string; full_name: string | null; email: string | null }[] } | null>(null);
  const [briefingProgressTaskId, setBriefingProgressTaskId] = useState<string | null>(null);
  const [showBriefingTaskPicker, setShowBriefingTaskPicker] = useState(false);
  const [showProgressTaskPicker, setShowProgressTaskPicker] = useState(false);
  const [complianceMap, setComplianceMap] = useState<Map<string, ComplianceStatus>>(new Map());

  // Events state
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', location: '' });
  const [addingGroupToEvent, setAddingGroupToEvent] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingTaskToGroup, setAddingTaskToGroup] = useState<{ eventId: string; groupId: string } | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [editEventForm, setEditEventForm] = useState({ title: '', description: '', event_date: '', location: '' });
  const [savingEvent, setSavingEvent] = useState(false);
  const [duplicatingEvent, setDuplicatingEvent] = useState<string | null>(null);

  // Create loose task form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', description: '', task_date: '', location: '', spots_available: 1,
    briefing_time: '', briefing_location: '', start_time: '', end_time: '',
    notes: '', expense_reimbursement: false, expense_amount: '',
    compensation_type: 'fixed' as string, hourly_rate: '', estimated_hours: '',
    loyalty_eligible: true, loyalty_points: '',
    required_training_id: '',
    partner_only: false, assigned_partner_id: '',
  });
  const [externalPartners, setExternalPartners] = useState<{ id: string; name: string; external_payroll: boolean }[]>([]);
  const [academyTrainings, setAcademyTrainings] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(profileData);

      const { data: ownedClubs } = await supabase
        .from('clubs')
        .select('id, name, sport, location, logo_url, stripe_account_id')
        .eq('owner_id', session.user.id);

      let activeClub = ownedClubs?.[0] || null;
      let ownerFlag = !!activeClub;

      if (!activeClub) {
        const { data: memberships } = await supabase
          .from('club_members')
          .select('club_id, role')
          .eq('user_id', session.user.id);

        if (memberships && memberships.length > 0) {
          const { data: club } = await supabase
            .from('clubs')
            .select('id, name, sport, location, logo_url, stripe_account_id')
            .eq('id', memberships[0].club_id)
            .maybeSingle();
          activeClub = club;
          setMyClubRole(memberships[0].role as 'bestuurder' | 'beheerder' | 'medewerker');
        }
      } else {
        setMyClubRole('bestuurder');
      }

      setIsOwner(ownerFlag);

      if (!activeClub) {
        setLoading(false);
        return;
      }

      setClubId(activeClub.id);
      setClubInfo({ name: activeClub.name, sport: activeClub.sport, location: activeClub.location, logo_url: activeClub.logo_url });
      setClubStripeId(activeClub.stripe_account_id || null);

      // Fetch contract templates
      const { data: templatesData } = await supabase
        .from('contract_templates')
        .select('id, name')
        .eq('club_id', activeClub.id)
        .order('created_at', { ascending: false });
      setContractTemplates(templatesData || []);

      // Fetch academy trainings for this club
      const { data: trainingsData } = await supabase
        .from('academy_trainings')
        .select('id, title')
        .eq('club_id', activeClub.id)
        .eq('is_published', true)
        .order('title');
      setAcademyTrainings(trainingsData || []);

      // Fetch external partners for this club
      const { data: partnersData } = await supabase
        .from('external_partners')
        .select('id, name, external_payroll')
        .eq('club_id', activeClub.id)
        .order('name');
      setExternalPartners(partnersData || []);

      const { data: eventsData } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('club_id', activeClub.id)
        .order('event_date', { ascending: true });
      setEvents(eventsData || []);

      // Fetch event groups
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map((e: any) => e.id);
        const { data: groupsData } = await (supabase as any)
          .from('event_groups')
          .select('*')
          .in('event_id', eventIds)
          .order('sort_order', { ascending: true });
        setEventGroups(groupsData || []);
      }

      // Fetch tasks (includes event tasks and loose tasks)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, description, task_date, location, spots_available, status, club_id, contract_template_id, contract_templates(name)')
        .eq('club_id', activeClub.id)
        .order('task_date', { ascending: true });

      // Add event_id and event_group_id from a separate query since types might not be updated
      if (tasksData) {
        const { data: taskExtras } = await (supabase as any)
          .from('tasks')
          .select('id, event_id, event_group_id')
          .eq('club_id', activeClub.id);
        const extraMap = new Map((taskExtras || []).map((t: any) => [t.id, t]));
        const enrichedTasks = tasksData.map(t => ({
          ...t,
          event_id: (extraMap.get(t.id) as any)?.event_id || null,
          event_group_id: (extraMap.get(t.id) as any)?.event_group_id || null,
        }));
        setTasks(enrichedTasks);
      } else {
        setTasks([]);
      }

      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: signupsData } = await supabase
          .from('task_signups')
          .select('id, task_id, volunteer_id, status, signed_up_at')
          .in('task_id', taskIds);

        if (signupsData && signupsData.length > 0) {
          const volunteerIds = [...new Set(signupsData.map(s => s.volunteer_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, created_at, phone, bio, bank_iban, bank_holder_name, bank_consent_given, bank_consent_date, stripe_account_id')
            .in('id', volunteerIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          const stripeIds: Record<string, string | null> = {};
          profiles?.forEach(p => { stripeIds[p.id] = p.stripe_account_id; });
          setVolunteerStripeIds(stripeIds);

          const grouped: Record<string, Signup[]> = {};
          signupsData.forEach(s => {
            const vol = profileMap.get(s.volunteer_id);
            const signup: Signup = {
              ...s,
              volunteer: vol ? { id: vol.id, full_name: vol.full_name, email: vol.email, avatar_url: vol.avatar_url, created_at: vol.created_at, phone: vol.phone, bio: vol.bio, bank_iban: vol.bank_iban, bank_holder_name: vol.bank_holder_name, bank_consent_given: vol.bank_consent_given, bank_consent_date: vol.bank_consent_date } : null,
            };
            if (!grouped[s.task_id]) grouped[s.task_id] = [];
            grouped[s.task_id].push(signup);
          });
          setSignups(grouped);

          fetchBatchComplianceData(volunteerIds).then(setComplianceMap).catch(console.error);
        }

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from('volunteer_payments')
          .select('task_id, volunteer_id, status, stripe_receipt_url, paid_at')
          .eq('club_id', activeClub.id);
        if (paymentsData) {
          const payMap: Record<string, { status: string; receipt_url?: string | null; paid_at?: string | null }> = {};
          paymentsData.forEach(p => { payMap[`${p.task_id}-${p.volunteer_id}`] = { status: p.status, receipt_url: p.stripe_receipt_url, paid_at: p.paid_at }; });
          setVolunteerPayments(payMap);
        }

        // Fetch signatures
        const { data: sigsData } = await supabase
          .from('signature_requests')
          .select('id, task_id, volunteer_id, status, document_url')
          .in('task_id', taskIds);
        if (sigsData) {
          const sigMap: Record<string, { status: string; document_url?: string | null; id?: string }> = {};
          sigsData.forEach(s => { sigMap[`${s.task_id}-${s.volunteer_id}`] = { status: s.status, document_url: s.document_url, id: s.id }; });
          setSignatureStatuses(sigMap);
        }
      }

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate('/login');
    });

    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

  // --- Handlers ---

  const handleUpdateStatus = async (signupId: string, taskId: string, newStatus: string, volunteer?: Signup['volunteer']) => {
    setUpdatingSignup(signupId);
    const { error } = await supabase.from('task_signups').update({ status: newStatus }).eq('id', signupId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newStatus === 'assigned' ? 'Vrijwilliger toegekend!' : 'Toekenning ingetrokken.');
      setSignups(prev => {
        const updated = { ...prev };
        if (updated[taskId]) {
          updated[taskId] = updated[taskId].map(s => s.id === signupId ? { ...s, status: newStatus } : s);
        }
        return updated;
      });
      if (newStatus === 'assigned' && volunteer) {
        const task = tasks.find(t => t.id === taskId);
        // Skip contract dialog if task is partner_only and partner handles payroll externally
        const isExternalPayroll = task?.partner_only && task?.assigned_partner_id && externalPartners.find(p => p.id === task.assigned_partner_id)?.external_payroll;
        if (task && task.contract_template_id && !isExternalPayroll) {
          setContractConfirm({ volunteer, task });
        }
      }
    }
    setUpdatingSignup(null);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newEvent.title.trim()) return;
    setCreatingEvent(true);
    const { data, error } = await (supabase as any)
      .from('events')
      .insert({
        club_id: clubId,
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        event_date: newEvent.event_date || null,
        location: newEvent.location.trim() || null,
      })
      .select('*')
      .maybeSingle();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      toast.success(dt.eventCreated);
      setEvents(prev => [...prev, data]);
      setShowCreateEventForm(false);
      setNewEvent({ title: '', description: '', event_date: '', location: '' });
      setExpandedEvent(data.id);

      // Auto-sync to Eventbrite if configured
      try {
        const { data: ticketConfig } = await supabase.from('ticketing_configs').select('*').eq('club_id', clubId).eq('is_active', true).maybeSingle();
        if (ticketConfig && ticketConfig.provider === 'eventbrite' && (ticketConfig as any).config_data?.organization_id) {
          const eventDate = newEvent.event_date ? new Date(newEvent.event_date) : new Date();
          const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // +4 hours default
          const startUtc = eventDate.toISOString().replace('.000Z', 'Z');
          const endUtc = endDate.toISOString().replace('.000Z', 'Z');

          const { data: ebResult, error: ebError } = await supabase.functions.invoke('ticketing-generate', {
            body: {
              action: 'create_event',
              club_id: clubId,
              event_title: data.title,
              event_start: startUtc,
              event_end: endUtc,
              timezone: 'Europe/Brussels',
              internal_event_id: data.id,
            },
          });
          if (ebError) {
            console.error('Eventbrite sync error:', ebError);
            toast.error(language === 'nl' ? 'Eventbrite-sync mislukt: ' + ebError.message : 'Eventbrite sync failed: ' + ebError.message);
          } else if (ebResult?.success) {
            toast.success(language === 'nl' ? 'Evenement automatisch aangemaakt in Eventbrite!' : 'Event automatically created in Eventbrite!');
          } else if (ebResult?.error) {
            toast.error('Eventbrite: ' + ebResult.error);
          }
        }
      } catch (syncErr: any) {
        console.error('Eventbrite auto-sync error:', syncErr);
      }
    }
    setCreatingEvent(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEvent(eventId);
    const { error } = await (supabase as any).from('events').delete().eq('id', eventId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dt.eventDeleted);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setEventGroups(prev => prev.filter(g => g.event_id !== eventId));
      setTasks(prev => prev.filter(t => t.event_id !== eventId));
      setConfirmDeleteEvent(null);
      if (expandedEvent === eventId) setExpandedEvent(null);
    }
    setDeletingEvent(null);
  };

  const handleStartEditEvent = (event: EventData) => {
    setEditingEvent(event);
    setEditEventForm({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
      location: event.location || '',
    });
  };

  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEvent(true);
    const { error } = await (supabase as any).from('events').update({
      title: editEventForm.title.trim(),
      description: editEventForm.description.trim() || null,
      event_date: editEventForm.event_date || null,
      location: editEventForm.location.trim() || null,
    }).eq('id', editingEvent.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dt.eventUpdated);
      setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? {
        ...ev,
        title: editEventForm.title.trim(),
        description: editEventForm.description.trim() || null,
        event_date: editEventForm.event_date || null,
        location: editEventForm.location.trim() || null,
      } : ev));
      setEditingEvent(null);
    }
    setSavingEvent(false);
  };

  const handleDuplicateEvent = async (eventId: string) => {
    if (!clubId) return;
    setDuplicatingEvent(eventId);
    const sourceEvent = events.find(e => e.id === eventId);
    if (!sourceEvent) { setDuplicatingEvent(null); return; }

    // 1. Create new event (copy without date)
    const { data: newEvt, error: evtErr } = await (supabase as any)
      .from('events')
      .insert({
        club_id: clubId,
        title: sourceEvent.title + (language === 'nl' ? ' (kopie)' : language === 'fr' ? ' (copie)' : ' (copy)'),
        description: sourceEvent.description,
        event_date: null,
        location: sourceEvent.location,
      })
      .select('*')
      .maybeSingle();
    if (evtErr || !newEvt) { toast.error(evtErr?.message || 'Error'); setDuplicatingEvent(null); return; }

    // 2. Copy groups
    const sourceGroups = eventGroups.filter(g => g.event_id === eventId);
    const groupMap: Record<string, string> = {}; // old -> new
    const newGroups: EventGroup[] = [];
    for (const g of sourceGroups) {
      const { data: newG } = await (supabase as any)
        .from('event_groups')
        .insert({ event_id: newEvt.id, name: g.name, color: g.color, sort_order: g.sort_order })
        .select('*')
        .maybeSingle();
      if (newG) {
        groupMap[g.id] = newG.id;
        newGroups.push(newG);
      }
    }

    // 3. Copy tasks (without date, reset signups)
    const sourceTasks = tasks.filter(t => t.event_id === eventId);
    const newTasks: Task[] = [];
    for (const t of sourceTasks) {
      const { data: fullTask } = await supabase.from('tasks').select('*').eq('id', t.id).maybeSingle();
      if (fullTask) {
        const newGroupId = t.event_group_id ? groupMap[t.event_group_id] || null : null;
        const { data: newT } = await (supabase as any)
          .from('tasks')
          .insert({
            club_id: clubId,
            title: fullTask.title,
            description: fullTask.description,
            task_date: null,
            location: fullTask.location,
            spots_available: fullTask.spots_available,
            briefing_time: null,
            briefing_location: fullTask.briefing_location,
            start_time: null,
            end_time: null,
            notes: fullTask.notes,
            expense_reimbursement: fullTask.expense_reimbursement,
            expense_amount: fullTask.expense_amount,
            contract_template_id: fullTask.contract_template_id,
            event_id: newEvt.id,
            event_group_id: newGroupId,
            compensation_type: (fullTask as any).compensation_type || 'fixed',
            hourly_rate: (fullTask as any).hourly_rate,
            estimated_hours: (fullTask as any).estimated_hours,
          })
          .select('id, title, description, task_date, location, spots_available, status, club_id, event_id, event_group_id')
          .maybeSingle();
        if (newT) newTasks.push(newT);
      }
    }

    setEvents(prev => [...prev, newEvt]);
    setEventGroups(prev => [...prev, ...newGroups]);
    setTasks(prev => [...prev, ...newTasks]);
    setExpandedEvent(newEvt.id);
    toast.success(dt.eventDuplicated);
    setDuplicatingEvent(null);
  };

  const handleAddGroup = async (eventId: string) => {
    if (!newGroupName.trim()) return;
    const existingGroups = eventGroups.filter(g => g.event_id === eventId);
    const color = GROUP_COLORS[existingGroups.length % GROUP_COLORS.length];
    const { data, error } = await (supabase as any)
      .from('event_groups')
      .insert({ event_id: eventId, name: newGroupName.trim(), color, sort_order: existingGroups.length })
      .select('*')
      .maybeSingle();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      toast.success(dt.groupCreated);
      setEventGroups(prev => [...prev, data]);
      setNewGroupName('');
      setAddingGroupToEvent(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const { error } = await (supabase as any).from('event_groups').delete().eq('id', groupId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dt.groupDeleted);
      setEventGroups(prev => prev.filter(g => g.id !== groupId));
      setTasks(prev => prev.filter(t => t.event_group_id !== groupId));
    }
  };

  const handleCreateTask = async (e: React.FormEvent, eventId?: string, groupId?: string) => {
    e.preventDefault();
    const isExternalPayrollPartner = newTask.partner_only && newTask.assigned_partner_id && externalPartners.find(p => p.id === newTask.assigned_partner_id)?.external_payroll;
    if (!clubId || !newTask.title.trim() || (!selectedTemplateId && !isExternalPayrollPartner)) return;
    setCreatingTask(true);

    const insertData: Record<string, unknown> = {
      club_id: clubId,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      task_date: newTask.task_date || null,
      location: newTask.location.trim() || null,
      spots_available: newTask.spots_available,
      briefing_time: newTask.briefing_time || null,
      briefing_location: newTask.briefing_location.trim() || null,
      start_time: newTask.start_time || null,
      end_time: newTask.end_time || null,
      notes: newTask.notes.trim() || null,
      expense_reimbursement: newTask.compensation_type === 'fixed' ? newTask.expense_reimbursement : false,
      expense_amount: newTask.compensation_type === 'fixed' && newTask.expense_reimbursement && newTask.expense_amount ? parseFloat(newTask.expense_amount) : null,
      contract_template_id: isExternalPayrollPartner ? null : selectedTemplateId,
      event_id: eventId || null,
      event_group_id: groupId || null,
      compensation_type: newTask.compensation_type,
      hourly_rate: newTask.compensation_type === 'hourly' && newTask.hourly_rate ? parseFloat(newTask.hourly_rate) : null,
      estimated_hours: newTask.compensation_type === 'hourly' && newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
      loyalty_eligible: newTask.loyalty_eligible,
      loyalty_points: newTask.loyalty_points ? parseInt(newTask.loyalty_points) : null,
      required_training_id: newTask.required_training_id || null,
      partner_only: newTask.partner_only,
      assigned_partner_id: newTask.partner_only && newTask.assigned_partner_id ? newTask.assigned_partner_id : null,
    };

    const { data, error } = await (supabase as any)
      .from('tasks')
      .insert(insertData)
      .select('id, title, description, task_date, location, spots_available, status, club_id, event_id, event_group_id')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      toast.success(dt.taskCreated);
      setTasks(prev => [...prev, data]);
      setShowCreateForm(false);
      setAddingTaskToGroup(null);
      setSelectedTemplateId('');
      setNewTask({ title: '', description: '', task_date: '', location: '', spots_available: 1, briefing_time: '', briefing_location: '', start_time: '', end_time: '', notes: '', expense_reimbursement: false, expense_amount: '', compensation_type: 'fixed', hourly_rate: '', estimated_hours: '', loyalty_eligible: true, loyalty_points: '', required_training_id: '', partner_only: false, assigned_partner_id: '' });
    }
    setCreatingTask(false);
  };

  const handleSendPayment = async (taskId: string, volunteerId: string) => {
    const key = `${taskId}-${volunteerId}`;
    setSendingPayment(key);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-transfer', {
        body: { task_id: taskId, volunteer_id: volunteerId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Betaling aangemaakt!');
      setVolunteerPayments(prev => ({ ...prev, [key]: { status: 'processing' } }));
    } catch (err: any) {
      toast.error(err.message || 'Er ging iets mis');
    }
    setSendingPayment(null);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
    supabase.from('tasks').select('*').eq('id', task.id).maybeSingle().then(({ data }) => {
      if (data) {
        setEditForm({
          title: data.title,
          description: data.description || '',
          task_date: data.task_date ? new Date(data.task_date).toISOString().slice(0, 16) : '',
          location: data.location || '',
          spots_available: data.spots_available || 1,
          briefing_time: data.briefing_time ? new Date(data.briefing_time).toISOString().slice(0, 16) : '',
          briefing_location: data.briefing_location || '',
          start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : '',
          end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '',
          notes: data.notes || '',
          expense_reimbursement: data.expense_reimbursement || false,
          expense_amount: data.expense_amount ? String(data.expense_amount) : '',
          contract_template_id: data.contract_template_id || '',
          compensation_type: (data as any).compensation_type || 'fixed',
          hourly_rate: (data as any).hourly_rate ? String((data as any).hourly_rate) : '',
          estimated_hours: (data as any).estimated_hours ? String((data as any).estimated_hours) : '',
        });
      }
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSavingTask(true);
    const updateData: Record<string, unknown> = {
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      task_date: editForm.task_date || null,
      location: editForm.location.trim() || null,
      spots_available: editForm.spots_available,
      briefing_time: editForm.briefing_time || null,
      briefing_location: editForm.briefing_location.trim() || null,
      start_time: editForm.start_time || null,
      end_time: editForm.end_time || null,
      notes: editForm.notes.trim() || null,
      expense_reimbursement: editForm.compensation_type === 'fixed' ? editForm.expense_reimbursement : false,
      expense_amount: editForm.compensation_type === 'fixed' && editForm.expense_reimbursement && editForm.expense_amount ? parseFloat(editForm.expense_amount) : null,
      contract_template_id: editForm.contract_template_id || null,
      compensation_type: editForm.compensation_type,
      hourly_rate: editForm.compensation_type === 'hourly' && editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null,
      estimated_hours: editForm.compensation_type === 'hourly' && editForm.estimated_hours ? parseFloat(editForm.estimated_hours) : null,
    };
    const { error } = await supabase.from('tasks').update(updateData as any).eq('id', editingTask.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dt.taskUpdated);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? {
        ...t, title: editForm.title.trim(), description: editForm.description.trim() || null,
        task_date: editForm.task_date || null, location: editForm.location.trim() || null,
        spots_available: editForm.spots_available, contract_template_id: editForm.contract_template_id || null,
      } : t));
      setEditingTask(null);
    }
    setSavingTask(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTask(taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dt.taskDeleted);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setConfirmDeleteTask(null);
      if (expandedTask === taskId) setExpandedTask(null);
    }
    setDeletingTask(null);
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  // Derived data
  const now = new Date();
  const looseTasks = tasks.filter(t => !t.event_id && (!t.task_date || new Date(t.task_date) >= now));
  const getEventTasks = (eventId: string) => tasks.filter(t => t.event_id === eventId);
  const getGroupTasks = (groupId: string) => tasks.filter(t => t.event_group_id === groupId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render a task card (reused for both event tasks and loose tasks)
  const renderTaskCard = (task: Task, i: number) => {
    const taskSignups = signups[task.id] || [];
    const pendingCount = taskSignups.filter(s => s.status === 'pending').length;
    const assignedCount = taskSignups.filter(s => s.status === 'assigned').length;
    const isExpanded = expandedTask === task.id;

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        className="bg-card rounded-2xl shadow-card border border-transparent overflow-hidden"
      >
        <button
          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
          className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-foreground">{task.title}</h3>
              {(task as any).partner_only && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent/20 text-accent-foreground flex items-center gap-0.5">
                  <Handshake className="w-3 h-3" /> Partner
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {task.task_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}
                </span>
              )}
              {task.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {task.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {taskSignups.length}/{task.spots_available} {dt.volunteers}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-secondary text-secondary-foreground">
                {pendingCount} {dt.pending.toLowerCase()}
              </span>
            )}
            {assignedCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/20 text-accent-foreground">
                {assignedCount} {dt.assigned.toLowerCase()}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {isExpanded && (
          <div className="flex items-center gap-2 px-5 pt-3 flex-wrap">
            <button onClick={(e) => { e.stopPropagation(); handleStartEdit(task); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="w-3.5 h-3.5" /> {dt.editTask}
            </button>
            {taskSignups.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setBulkMessageTask({ taskId: task.id, taskTitle: task.title, volunteers: taskSignups.filter(s => s.volunteer).map(s => ({ id: s.volunteer_id, full_name: s.volunteer!.full_name, email: s.volunteer!.email })) }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Bericht naar alle ({taskSignups.length})
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); navigate(`/briefing-builder?taskId=${task.id}&clubId=${task.club_id || clubId}`); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <ClipboardList className="w-3.5 h-3.5" /> Briefing
            </button>
            <button onClick={(e) => { e.stopPropagation(); setBriefingProgressTaskId(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent/50 text-accent-foreground hover:bg-accent transition-colors">
              <Users className="w-3.5 h-3.5" /> Voortgang
            </button>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTask(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> {dt.deleteTask}
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="border-t border-border px-5 pb-5">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4 mb-3">
              {dt.signups} ({taskSignups.length})
            </h4>
            {taskSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{dt.noSignups}</p>
            ) : (
              <div className="space-y-2">
                {taskSignups.map(signup => (
                  <div
                    key={signup.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors ${
                      signup.status === 'assigned' ? 'bg-accent/10 border border-accent/20' : 'bg-muted/30 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => signup.volunteer && setSelectedVolunteer({ volunteer: signup.volunteer, signupStatus: signup.status, signedUpAt: signup.signed_up_at })}
                      className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="w-9 h-9 shrink-0">
                        {signup.volunteer?.avatar_url && <AvatarImage src={signup.volunteer.avatar_url} alt={signup.volunteer.full_name || ''} />}
                        <AvatarFallback className={`text-xs font-bold ${signup.status === 'assigned' ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {(signup.volunteer?.full_name || signup.volunteer?.email || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">{signup.volunteer?.full_name || 'Onbekend'}</p>
                          <ComplianceBadge compliance={complianceMap.get(signup.volunteer_id) || null} language={language} compact />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{signup.volunteer?.email || ''}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/chat?taskId=${task.id}&clubOwnerId=${currentUserId}&volunteerId=${signup.volunteer_id}`)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Bericht sturen"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      {signup.status === 'assigned' ? (
                        <>
                          <span className="flex items-center gap-1 text-xs font-medium text-accent-foreground">
                            <CheckCircle className="w-3.5 h-3.5" /> {dt.assigned}
                          </span>
                          {(() => {
                            const payKey = `${signup.task_id}-${signup.volunteer_id}`;
                            const payment = volunteerPayments[payKey];
                            const sigInfo = signatureStatuses[payKey];
                            const contractSigned = sigInfo?.status === 'completed';
                            const volHasStripe = !!volunteerStripeIds[signup.volunteer_id];
                            const isHourly = task.compensation_type === 'hourly';
                            // Stripe payments temporarily disabled - using SEPA only
                            const canPay = false; // was: clubStripeId && volHasStripe && contractSigned && (!payment || payment.status === 'failed');

                            // Show hour confirmation button for hourly tasks
                            if (isHourly && contractSigned && (!payment || payment.status === 'failed')) {
                              return (
                                <div className="flex items-center gap-1">
                                  {sigInfo?.document_url && (
                                    <a href={sigInfo.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                      <Download className="w-3 h-3" /> Contract
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setHourConfirmOpen({ taskId: task.id, volunteerId: signup.volunteer_id, volunteerName: signup.volunteer?.full_name || 'Vrijwilliger', hourlyRate: task.hourly_rate || 0, estimatedHours: task.estimated_hours || 0 })}
                                    className="px-2.5 py-1 text-[10px] rounded-lg bg-accent/50 text-accent-foreground hover:bg-accent transition-colors flex items-center gap-1"
                                  >
                                    <Timer className="w-3 h-3" /> Uren
                                  </button>
                                </div>
                              );
                            }

                            if (payment && payment.status === 'succeeded') {
                              return (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                  <CheckCircle className="w-3.5 h-3.5" /> Betaald
                                  {payment.receipt_url && <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer" className="ml-1"><Download className="w-3 h-3" /></a>}
                                </span>
                              );
                            }
                            if (payment && payment.status === 'processing') {
                              return <span className="flex items-center gap-1 text-xs text-yellow-600"><Clock className="w-3.5 h-3.5" /> Verwerken</span>;
                            }
                            if (contractSigned && sigInfo?.document_url) {
                              return (
                                <div className="flex items-center gap-1">
                                  <a href={sigInfo.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download ondertekend contract">
                                    <Download className="w-3 h-3" /> Contract
                                  </a>
                                  {canPay && (
                                    <button onClick={() => handleSendPayment(signup.task_id, signup.volunteer_id)} disabled={sendingPayment === payKey} className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1">
                                      {sendingPayment === payKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Betaal
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            if (!contractSigned) {
                              // If partner handles contracts externally, show badge instead of send button
                              const isExternalPayroll = (task as any).partner_only && (task as any).assigned_partner_id && externalPartners.find(p => p.id === (task as any).assigned_partner_id)?.external_payroll;
                              if (isExternalPayroll) {
                                return (
                                  <span className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-muted text-muted-foreground">
                                    <Handshake className="w-3 h-3" /> Extern contract
                                  </span>
                                );
                              }
                              const contractKey = `${signup.task_id}-${signup.volunteer_id}`;
                              const isSending = sendingContract === contractKey;
                              return (
                                <button
                                  onClick={async () => {
                                    setSendingContract(contractKey);
                                    try {
                                      const tmplId = task.contract_template_id;
                                      if (!tmplId) { toast.error('Geen contractsjabloon gekoppeld aan deze taak.'); setSendingContract(null); return; }
                                      const { data: tmpl } = await supabase.from('contract_templates').select('docuseal_template_id').eq('id', tmplId).maybeSingle();
                                      if (!tmpl) { toast.error('Contractsjabloon niet gevonden.'); setSendingContract(null); return; }
                                      const { data: { session: sess } } = await supabase.auth.getSession();
                                      if (!sess) { setSendingContract(null); return; }
                                      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-submission`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${sess.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ template_id: tmpl.docuseal_template_id, task_id: signup.task_id, volunteer_email: signup.volunteer?.email, volunteer_name: signup.volunteer?.full_name }),
                                      });
                                      const result = await resp.json();
                                      if (resp.ok && result.success) {
                                        toast.success('Contract verstuurd naar vrijwilliger!');
                                        setSignatureStatuses(prev => ({ ...prev, [contractKey]: { status: 'pending' } }));
                                      } else { toast.error(result.error || 'Er ging iets mis bij het versturen.'); }
                                    } catch (err: any) { toast.error(err.message || 'Er ging iets mis.'); }
                                    setSendingContract(null);
                                  }}
                                  disabled={isSending}
                                  className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSignature className="w-3 h-3" />} Contract
                                </button>
                              );
                            }
                            if (canPay) {
                              return (
                                <button onClick={() => handleSendPayment(signup.task_id, signup.volunteer_id)} disabled={sendingPayment === payKey} className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1">
                                  {sendingPayment === payKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Betaal
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <button onClick={() => handleUpdateStatus(signup.id, signup.task_id, 'pending')} disabled={updatingSignup === signup.id} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                            {dt.unassign}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {dt.pending}</span>
                          <button onClick={() => handleUpdateStatus(signup.id, signup.task_id, 'assigned', signup.volunteer)} disabled={updatingSignup === signup.id} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                            {dt.assign}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Task creation form (reused)
  const renderTaskForm = (onSubmit: (e: React.FormEvent) => void, onCancel: () => void) => (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={onSubmit}
      className="bg-card rounded-2xl shadow-card border border-border p-6 overflow-hidden"
    >
      <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{dt.newTask}</h2>
      {/* Partner-only task - moved to top */}
      {externalPartners.length > 0 && (
        <div className="mb-4 bg-muted/50 rounded-xl p-4 border border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newTask.partner_only} onChange={e => setNewTask(p => ({ ...p, partner_only: e.target.checked, assigned_partner_id: '' }))} className="w-4 h-4 rounded border-input accent-primary" />
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Handshake className="w-4 h-4 text-primary" />
              {language === 'nl' ? 'Enkel voor externe partner' : language === 'fr' ? 'Uniquement pour partenaire externe' : 'Partner-only task'}
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground mt-1 ml-6">
            {language === 'nl' ? 'Alleen de geselecteerde partner kan leden toewijzen aan deze taak.' : language === 'fr' ? 'Seul le partenaire sélectionné peut assigner des membres à cette tâche.' : 'Only the selected partner can assign members to this task.'}
          </p>
          {newTask.partner_only && (
            <div className="mt-3 ml-6">
              <label className={labelClass}>{language === 'nl' ? 'Selecteer partner' : language === 'fr' ? 'Sélectionner partenaire' : 'Select partner'} *</label>
              <select required value={newTask.assigned_partner_id} onChange={e => setNewTask(p => ({ ...p, assigned_partner_id: e.target.value }))} className={inputClass}>
                <option value="">{language === 'nl' ? 'Kies een partner...' : language === 'fr' ? 'Choisir un partenaire...' : 'Choose a partner...'}</option>
                {externalPartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {(() => {
                const selectedPartner = externalPartners.find(p => p.id === newTask.assigned_partner_id);
                if (selectedPartner?.external_payroll) {
                  return (
                    <div className="mt-3 flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 text-xs text-accent-foreground">
                      <Handshake className="w-4 h-4 text-primary shrink-0" />
                      <span>{language === 'nl' ? 'Deze partner beheert contracten & betalingen zelf. Je hoeft geen contractsjabloon te selecteren.' : language === 'fr' ? 'Ce partenaire gère les contrats et paiements. Aucun modèle requis.' : 'This partner manages contracts & payments. No template needed.'}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}
      {/* Contract template - hidden when partner handles it externally */}
      {!(newTask.partner_only && newTask.assigned_partner_id && externalPartners.find(p => p.id === newTask.assigned_partner_id)?.external_payroll) && (
        <div className="mb-4">
          <label className={labelClass}>{dt.contractTemplate} *</label>
          {contractTemplates.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <span>{dt.noTemplatesYet}</span>
              <button type="button" onClick={() => setShowTemplates(true)} className="text-primary underline hover:opacity-80">{dt.manageTemplates}</button>
            </div>
          ) : (
            <select required value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className={inputClass}>
              <option value="">{dt.selectTemplate}</option>
              {contractTemplates.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>)}
            </select>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>{dt.taskTitle} *</label>
          <input type="text" required maxLength={200} value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{dt.taskDescription}</label>
          <textarea rows={3} maxLength={2000} value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskDate}</label>
          <input type="datetime-local" value={newTask.task_date} onChange={e => setNewTask(p => ({ ...p, task_date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskLocation}</label>
          <input type="text" maxLength={300} value={newTask.location} onChange={e => setNewTask(p => ({ ...p, location: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskSpots}</label>
          <input type="number" min={1} max={999} value={newTask.spots_available} onChange={e => setNewTask(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskBriefingLocation}</label>
          <input type="text" maxLength={300} value={newTask.briefing_location} onChange={e => setNewTask(p => ({ ...p, briefing_location: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskBriefingTime}</label>
          <input type="datetime-local" value={newTask.briefing_time} onChange={e => setNewTask(p => ({ ...p, briefing_time: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskStartTime}</label>
          <input type="datetime-local" value={newTask.start_time} onChange={e => setNewTask(p => ({ ...p, start_time: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskEndTime}</label>
          <input type="datetime-local" value={newTask.end_time} onChange={e => setNewTask(p => ({ ...p, end_time: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{dt.taskNotes}</label>
          <input type="text" maxLength={500} value={newTask.notes} onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{language === 'nl' ? 'Vergoedingstype' : language === 'fr' ? 'Type de rémunération' : 'Compensation type'}</label>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setNewTask(p => ({ ...p, compensation_type: 'fixed' }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${newTask.compensation_type === 'fixed' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
              {language === 'nl' ? 'Vast bedrag' : language === 'fr' ? 'Montant fixe' : 'Fixed amount'}
            </button>
            <button type="button" onClick={() => setNewTask(p => ({ ...p, compensation_type: 'hourly' }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${newTask.compensation_type === 'hourly' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
              <Timer className="w-3.5 h-3.5" /> {language === 'nl' ? 'Uurloon' : language === 'fr' ? 'Taux horaire' : 'Hourly rate'}
            </button>
          </div>
        </div>
        {newTask.compensation_type === 'fixed' && (
          <div className="sm:col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newTask.expense_reimbursement} onChange={e => setNewTask(p => ({ ...p, expense_reimbursement: e.target.checked }))} className="w-4 h-4 rounded border-input accent-primary" />
              <span className="text-sm text-foreground">{dt.taskExpenseReimbursement}</span>
            </label>
            {newTask.expense_reimbursement && (
              <input type="number" min={1} step={0.01} placeholder={dt.taskExpenseAmount} value={newTask.expense_amount} onChange={e => setNewTask(p => ({ ...p, expense_amount: e.target.value }))} className={inputClass + ' max-w-[150px]'} />
            )}
          </div>
        )}
        {newTask.compensation_type === 'hourly' && (
          <div className="sm:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{language === 'nl' ? 'Uurloon (€)' : language === 'fr' ? 'Taux horaire (€)' : 'Hourly rate (€)'} *</label>
              <input type="number" min={1} step={0.01} required value={newTask.hourly_rate} onChange={e => setNewTask(p => ({ ...p, hourly_rate: e.target.value }))} className={inputClass} placeholder="5.00" />
            </div>
            <div>
              <label className={labelClass}>{language === 'nl' ? 'Geschatte uren' : language === 'fr' ? 'Heures estimées' : 'Estimated hours'} *</label>
              <input type="number" min={0.5} step={0.5} required value={newTask.estimated_hours} onChange={e => setNewTask(p => ({ ...p, estimated_hours: e.target.value }))} className={inputClass} placeholder="5" />
            </div>
            {newTask.hourly_rate && newTask.estimated_hours && (
              <div className="col-span-2 bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{language === 'nl' ? 'Geschatte vergoeding' : language === 'fr' ? 'Rémunération estimée' : 'Estimated compensation'}: <span className="font-bold text-foreground">€{(parseFloat(newTask.hourly_rate) * parseFloat(newTask.estimated_hours)).toFixed(2)}</span></p>
              </div>
            )}
          </div>
        )}
        {/* Loyalty fields */}
        <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
          <label className={labelClass}>{language === 'nl' ? 'Loyaliteitsprogramma' : language === 'fr' ? 'Programme de fidélité' : 'Loyalty program'}</label>
          <label className="flex items-center gap-2 cursor-pointer mt-1.5">
            <input type="checkbox" checked={newTask.loyalty_eligible} onChange={e => setNewTask(p => ({ ...p, loyalty_eligible: e.target.checked }))} className="w-4 h-4 rounded border-input accent-primary" />
            <span className="text-sm text-foreground">{language === 'nl' ? 'Telt mee voor loyaliteitsprogramma' : language === 'fr' ? 'Compte pour le programme de fidélité' : 'Counts toward loyalty program'}</span>
          </label>
          {newTask.loyalty_eligible && (
            <div className="mt-3">
              <label className={labelClass}>{language === 'nl' ? 'Loyaliteitspunten (optioneel)' : language === 'fr' ? 'Points de fidélité (optionnel)' : 'Loyalty points (optional)'}</label>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <input type="number" min={0} max={9999} placeholder={language === 'nl' ? 'bv. 10' : language === 'fr' ? 'ex. 10' : 'e.g. 10'} value={newTask.loyalty_points} onChange={e => setNewTask(p => ({ ...p, loyalty_points: e.target.value }))} className={inputClass + ' max-w-[150px]'} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{language === 'nl' ? 'Laat leeg als het programma op taken is gebaseerd.' : language === 'fr' ? 'Laissez vide si le programme est basé sur les tâches.' : 'Leave empty if the program is task-based.'}</p>
            </div>
          )}
        </div>
        {/* Required training */}
        {academyTrainings.length > 0 && (
          <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
            <label className={labelClass}>{language === 'nl' ? 'Verplichte training (optioneel)' : language === 'fr' ? 'Formation obligatoire (optionnel)' : 'Required training (optional)'}</label>
            <select value={newTask.required_training_id} onChange={e => setNewTask(p => ({ ...p, required_training_id: e.target.value }))} className={inputClass}>
              <option value="">{language === 'nl' ? 'Geen verplichte training' : language === 'fr' ? 'Pas de formation obligatoire' : 'No required training'}</option>
              {academyTrainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">{language === 'nl' ? 'Vrijwilligers moeten deze training voltooid hebben om zich in te schrijven.' : language === 'fr' ? 'Les bénévoles doivent avoir terminé cette formation pour s\'inscrire.' : 'Volunteers must have completed this training to sign up.'}</p>
          </div>
        )}
        {/* Partner-only section is now at the top of the form */}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{dt.cancel}</button>
        <button type="submit" disabled={creatingTask || !newTask.title.trim() || (!selectedTemplateId && !(newTask.partner_only && newTask.assigned_partner_id && externalPartners.find(p => p.id === newTask.assigned_partner_id)?.external_payroll)) || (newTask.partner_only && !newTask.assigned_partner_id)} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {creatingTask ? dt.creating : dt.create}
        </button>
      </div>
    </motion.form>
  );

  const sidebarEl = (
    <ClubOwnerSidebar
      profile={profile ? { ...profile, avatar_url: null } : null}
      clubInfo={clubInfo ? { name: clubInfo.name, logo_url: clubInfo.logo_url } : null}
      onLogout={async () => { await supabase.auth.signOut(); navigate('/login'); }}
      onOpenProfile={() => setShowProfileDialog(true)}
      onOpenSettings={isOwner ? () => setShowSettings(true) : undefined}
      onOpenMembers={() => setShowMembers(true)}
    />
  );

  return (
    <DashboardLayout sidebar={sidebarEl}>
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">{dt.title}</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'nl' ? 'Overzicht van je club' : language === 'fr' ? 'Aperçu de votre club' : 'Your club overview'}
            </p>
          </div>
          <button onClick={() => navigate('/events-manager')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            {language === 'nl' ? 'Nieuw' : language === 'fr' ? 'Nouveau' : 'New'}
          </button>
        </motion.div>

        {/* KPI Cards */}
        <MonthlyPlanningKPIs clubId={clubId} language={language} navigate={navigate} />

        {/* Standard KPI Cards */}
        {(() => {
          const now = new Date();
          const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const upcomingEventCount = events.filter(e => e.event_date && new Date(e.event_date) >= now && new Date(e.event_date) <= in30).length;
          const allSignups = Object.values(signups).flat();
          const pendingSignupCount = allSignups.filter(s => s.status === 'pending').length;
          const activeVolunteerCount = new Set(allSignups.filter(s => s.status === 'assigned').map(s => s.volunteer_id)).size;
          const unsignedContractCount = Object.values(signatureStatuses).filter(s => s.status === 'pending').length;

          const kpis = [
            { label: language === 'nl' ? 'Aankomende evenementen' : 'Upcoming events', value: upcomingEventCount, icon: CalendarDays, color: 'text-primary bg-primary/10' },
            { label: language === 'nl' ? 'Openstaande aanmeldingen' : 'Pending signups', value: pendingSignupCount, icon: Clock, color: 'text-yellow-600 bg-yellow-500/10' },
            { label: language === 'nl' ? 'Actieve vrijwilligers' : 'Active volunteers', value: activeVolunteerCount, icon: Users, color: 'text-accent-foreground bg-accent/10' },
            { label: language === 'nl' ? 'Ongetekende contracten' : 'Unsigned contracts', value: unsignedContractCount, icon: FileSignature, color: 'text-destructive bg-destructive/10' },
          ];

          return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl font-heading font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                </div>
              ))}
            </motion.div>
          );
        })()}

        {/* UPCOMING EVENTS SECTION */}
        {(() => {
          const now = new Date();
          const futureEvents = events.filter(e => !e.event_date || new Date(e.event_date) >= now);
          if (futureEvents.length === 0 && looseTasks.length === 0) {
            return (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{dt.noEvents}</p>
                <button onClick={() => navigate('/events-manager')} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                  {dt.newEvent} →
                </button>
              </div>
            );
          }
          return (
            <>
              {futureEvents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-primary" /> {dt.events}
                    </h2>
                    <button onClick={() => navigate('/events-manager')} className="text-xs text-primary hover:underline">
                      {language === 'nl' ? 'Alles bekijken' : 'View all'} →
                    </button>
                  </div>
                  <div className="space-y-4">
                    {futureEvents.map((event, ei) => {
                      const isEventExpanded = expandedEvent === event.id;
                      const groups = eventGroups.filter(g => g.event_id === event.id);
                      const eventTaskCount = getEventTasks(event.id).length;

                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: ei * 0.05 }}
                          className="bg-card rounded-2xl shadow-card border border-primary/10 overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedEvent(isEventExpanded ? null : event.id)}
                            className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1">
                              <h3 className="font-heading font-semibold text-foreground text-lg">{event.title}</h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {event.event_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
                                )}
                                <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{groups.length} {language === 'nl' ? 'groepen' : 'groups'}</span>
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{eventTaskCount} {language === 'nl' ? 'taken' : 'tasks'}</span>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {isEventExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>
                          </button>

                          {isEventExpanded && (
                            <div className="border-t border-border px-5 pb-5">
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-3 mb-4">{event.description}</p>
                              )}

                              {/* Groups within event */}
                              {groups.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  {language === 'nl' ? 'Geen groepen.' : 'No groups.'}
                                </p>
                              ) : (
                                <div className="space-y-4 mt-3">
                                  {groups.sort((a, b) => a.sort_order - b.sort_order).map(group => {
                                    const groupTasks = getGroupTasks(group.id);
                                    return (
                                      <div key={group.id} className="rounded-xl border border-border overflow-hidden">
                                        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: group.color + '15' }}>
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                                            <h4 className="font-medium text-foreground text-sm">{group.name}</h4>
                                            <span className="text-xs text-muted-foreground">({groupTasks.length} {language === 'nl' ? 'taken' : 'tasks'})</span>
                                          </div>
                                        </div>
                                        <div className="divide-y divide-border">
                                          {groupTasks.map((task, ti) => renderTaskCard(task, ti))}
                                          {groupTasks.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-3">
                                              {language === 'nl' ? 'Geen taken in deze groep' : 'No tasks in this group'}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LOOSE TASKS SECTION */}
              {looseTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-muted-foreground" /> {dt.looseTasks}
                  </h2>
                  <div className="space-y-4">
                    {looseTasks.map((task, i) => renderTaskCard(task, i))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </main>

      {/* Dialogs */}
      {showSettings && clubId && clubInfo && (
        <ClubSettingsDialog clubId={clubId} clubInfo={clubInfo} onClose={() => setShowSettings(false)} onUpdated={(info) => setClubInfo(info)} />
      )}
      {showMembers && clubId && (
        <ClubMembersDialog clubId={clubId} currentUserId={currentUserId} isOwner={isOwner} currentUserRole={myClubRole} onClose={() => setShowMembers(false)} />
      )}
      {showTemplates && clubId && (
        <ContractTemplatesDialog clubId={clubId} language={language} onClose={() => { setShowTemplates(false); supabase.from('contract_templates').select('id, name').eq('club_id', clubId).order('created_at', { ascending: false }).then(({ data }) => setContractTemplates(data || [])); }} />
      )}
      <VolunteerProfileDialog volunteer={selectedVolunteer?.volunteer || null} open={!!selectedVolunteer} onOpenChange={(open) => !open && setSelectedVolunteer(null)} language={language} signupStatus={selectedVolunteer?.signupStatus} signedUpAt={selectedVolunteer?.signedUpAt} />
      {contractConfirm && contractConfirm.volunteer && (
        <SendContractConfirmDialog
          open={!!contractConfirm}
          onOpenChange={(open) => !open && setContractConfirm(null)}
          volunteer={{ id: contractConfirm.volunteer.id, full_name: contractConfirm.volunteer.full_name, email: contractConfirm.volunteer.email, phone: contractConfirm.volunteer.phone, bank_iban: contractConfirm.volunteer.bank_iban, bank_holder_name: contractConfirm.volunteer.bank_holder_name }}
          task={{ id: contractConfirm.task.id, title: contractConfirm.task.title, task_date: contractConfirm.task.task_date, location: contractConfirm.task.location, contract_template_id: contractConfirm.task.contract_template_id }}
          clubId={clubId || undefined}
          clubName={clubInfo?.name}
          language={language}
          onSent={() => { const key = `${contractConfirm.task.id}-${contractConfirm.volunteer!.id}`; setSignatureStatuses(prev => ({ ...prev, [key]: { status: 'pending' } })); setContractConfirm(null); }}
        />
      )}

      {/* Edit Task Dialog */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingTask(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">{dt.editTask}</h2>
                <button onClick={() => setEditingTask(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className={labelClass}>{dt.contractTemplate}</label>
                  <select value={editForm.contract_template_id} onChange={e => setEditForm(p => ({ ...p, contract_template_id: e.target.value }))} className={inputClass}>
                    <option value="">{dt.selectTemplate}</option>
                    {contractTemplates.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{dt.taskTitle} *</label>
                  <input type="text" required maxLength={200} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{dt.taskDescription}</label>
                  <textarea rows={3} maxLength={2000} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>{dt.taskDate}</label><input type="datetime-local" value={editForm.task_date} onChange={e => setEditForm(p => ({ ...p, task_date: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskLocation}</label><input type="text" maxLength={300} value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskSpots}</label><input type="number" min={1} max={999} value={editForm.spots_available} onChange={e => setEditForm(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskBriefingLocation}</label><input type="text" maxLength={300} value={editForm.briefing_location} onChange={e => setEditForm(p => ({ ...p, briefing_location: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskBriefingTime}</label><input type="datetime-local" value={editForm.briefing_time} onChange={e => setEditForm(p => ({ ...p, briefing_time: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskStartTime}</label><input type="datetime-local" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskEndTime}</label><input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{dt.taskNotes}</label><input type="text" maxLength={500} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} /></div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.expense_reimbursement} onChange={e => setEditForm(p => ({ ...p, expense_reimbursement: e.target.checked }))} className="w-4 h-4 rounded border-input accent-primary" />
                    <span className="text-sm text-foreground">{dt.taskExpenseReimbursement}</span>
                  </label>
                  {editForm.expense_reimbursement && (
                    <input type="number" min={0} step={0.01} placeholder={dt.taskExpenseAmount} value={editForm.expense_amount} onChange={e => setEditForm(p => ({ ...p, expense_amount: e.target.value }))} className={inputClass + ' max-w-[150px]'} />
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{dt.cancel}</button>
                  <button type="submit" disabled={savingTask || !editForm.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {savingTask ? dt.saving : dt.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Task Confirmation */}
      <AnimatePresence>
        {confirmDeleteTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteTask(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                <h2 className="text-lg font-heading font-semibold text-foreground">{dt.deleteTask}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{dt.deleteConfirm}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteTask(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{dt.cancel}</button>
                <button onClick={() => handleDeleteTask(confirmDeleteTask)} disabled={deletingTask === confirmDeleteTask} className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {deletingTask === confirmDeleteTask ? <Loader2 className="w-4 h-4 animate-spin" /> : dt.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation */}
      <AnimatePresence>
        {confirmDeleteEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteEvent(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                <h2 className="text-lg font-heading font-semibold text-foreground">{dt.deleteEvent}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{dt.deleteEventConfirm}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteEvent(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{dt.cancel}</button>
                <button onClick={() => handleDeleteEvent(confirmDeleteEvent)} disabled={deletingEvent === confirmDeleteEvent} className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {deletingEvent === confirmDeleteEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : dt.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Event Dialog */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingEvent(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">{dt.editEvent}</h2>
                <button onClick={() => setEditingEvent(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveEditEvent} className="space-y-4">
                <div>
                  <label className={labelClass}>{dt.eventTitle} *</label>
                  <input type="text" required maxLength={200} value={editEventForm.title} onChange={e => setEditEventForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{dt.eventDescription}</label>
                  <textarea rows={2} maxLength={2000} value={editEventForm.description} onChange={e => setEditEventForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{dt.eventDate}</label>
                    <input type="datetime-local" value={editEventForm.event_date} onChange={e => setEditEventForm(p => ({ ...p, event_date: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.eventLocation}</label>
                    <input type="text" maxLength={300} value={editEventForm.location} onChange={e => setEditEventForm(p => ({ ...p, location: e.target.value }))} className={inputClass} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{dt.cancel}</button>
                  <button type="submit" disabled={savingEvent || !editEventForm.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {savingEvent ? dt.saving : dt.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <EditProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} userId={currentUserId} language={language} onProfileUpdated={(p) => setProfile({ full_name: p.full_name || '', email: p.email || '' })} />
      {bulkMessageTask && <BulkMessageDialog taskId={bulkMessageTask.taskId} taskTitle={bulkMessageTask.taskTitle} clubOwnerId={currentUserId} volunteers={bulkMessageTask.volunteers} onClose={() => setBulkMessageTask(null)} />}
      {briefingProgressTaskId && <BriefingProgressDialog open={!!briefingProgressTaskId} onOpenChange={(open) => { if (!open) setBriefingProgressTaskId(null); }} taskId={briefingProgressTaskId} language={language} />}
      <TaskPickerDialog open={showBriefingTaskPicker} onOpenChange={setShowBriefingTaskPicker} tasks={tasks} language={language} title={language === 'nl' ? 'Briefing aanmaken' : language === 'fr' ? 'Créer un briefing' : 'Create briefing'} onSelect={(taskId) => { const task = tasks.find(t => t.id === taskId); if (task) navigate(`/briefing-builder?taskId=${taskId}&clubId=${task.club_id || clubId}`); }} />
      <TaskPickerDialog open={showProgressTaskPicker} onOpenChange={setShowProgressTaskPicker} tasks={tasks} language={language} title={language === 'nl' ? 'Opvolging bekijken' : language === 'fr' ? 'Voir le suivi' : 'View follow-up'} onSelect={(taskId) => setBriefingProgressTaskId(taskId)} />
      {hourConfirmOpen && (
        <HourConfirmationDialog
          open={!!hourConfirmOpen}
          onOpenChange={(open) => { if (!open) setHourConfirmOpen(null); }}
          taskId={hourConfirmOpen.taskId}
          volunteerId={hourConfirmOpen.volunteerId}
          volunteerName={hourConfirmOpen.volunteerName}
          hourlyRate={hourConfirmOpen.hourlyRate}
          estimatedHours={hourConfirmOpen.estimatedHours}
          role="club"
          language={language}
          onOpenChat={() => { setHourConfirmOpen(null); navigate(`/chat?taskId=${hourConfirmOpen.taskId}&clubOwnerId=${currentUserId}&volunteerId=${hourConfirmOpen.volunteerId}`); }}
        />
      )}
    </DashboardLayout>
  );
};

export default ClubOwnerDashboard;
