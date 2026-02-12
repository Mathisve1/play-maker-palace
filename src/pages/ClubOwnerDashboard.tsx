import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, MapPin, LogOut, CheckCircle, Clock, ChevronDown, ChevronUp, Plus, X, Settings, Shield, FileText, CreditCard, Send, Loader2, AlertTriangle, Download, Bell, FileSignature, Pencil, Trash2 } from 'lucide-react';
import Logo from '@/components/Logo';
import ClubSettingsDialog from '@/components/ClubSettingsDialog';
import ClubMembersDialog from '@/components/ClubMembersDialog';
import NotificationBell from '@/components/NotificationBell';
import ContractTemplatesDialog from '@/components/ContractTemplatesDialog';
import VolunteerProfileDialog from '@/components/VolunteerProfileDialog';
import SendContractConfirmDialog from '@/components/SendContractConfirmDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';

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
}

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
    newTask: 'Nieuwe taak',
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
    newTask: 'Nouvelle tâche',
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
    newTask: 'New task',
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
  });
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);

  // Create task form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_date: '',
    location: '',
    spots_available: 1,
    briefing_time: '',
    briefing_location: '',
    start_time: '',
    end_time: '',
    notes: '',
    expense_reimbursement: false,
    expense_amount: '',
  });

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

      // Check if user is owner of any club
      const { data: ownedClubs } = await supabase
        .from('clubs')
        .select('id, name, sport, location, logo_url, stripe_account_id')
        .eq('owner_id', session.user.id);

      let activeClub = ownedClubs?.[0] || null;
      let ownerFlag = !!activeClub;

      // If not owner, check club_members
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
      const clubIds = [activeClub.id];

      // Fetch contract templates for this club
      const { data: templatesData } = await supabase
        .from('contract_templates')
        .select('id, name')
        .eq('club_id', activeClub.id)
        .order('created_at', { ascending: false });
      setContractTemplates(templatesData || []);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, description, task_date, location, spots_available, status, club_id, contract_template_id, contract_templates(name)')
        .in('club_id', clubIds)
        .order('task_date', { ascending: true });

      setTasks(tasksData || []);

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

          // Store volunteer stripe IDs
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
        }

        // Fetch payments for this club
        const { data: paymentsData } = await supabase
          .from('volunteer_payments')
          .select('task_id, volunteer_id, status, stripe_receipt_url, paid_at')
          .eq('club_id', activeClub.id);
        if (paymentsData) {
          const payMap: Record<string, { status: string; receipt_url?: string | null; paid_at?: string | null }> = {};
          paymentsData.forEach(p => { payMap[`${p.task_id}-${p.volunteer_id}`] = { status: p.status, receipt_url: p.stripe_receipt_url, paid_at: p.paid_at }; });
          setVolunteerPayments(payMap);
        }

        // Fetch signature statuses
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

  const handleUpdateStatus = async (signupId: string, taskId: string, newStatus: string, volunteer?: Signup['volunteer']) => {
    setUpdatingSignup(signupId);
    const { error } = await supabase
      .from('task_signups')
      .update({ status: newStatus })
      .eq('id', signupId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newStatus === 'assigned' ? 'Vrijwilliger toegekend!' : 'Toekenning ingetrokken.');
      setSignups(prev => {
        const updated = { ...prev };
        if (updated[taskId]) {
          updated[taskId] = updated[taskId].map(s =>
            s.id === signupId ? { ...s, status: newStatus } : s
          );
        }
        return updated;
      });

      // Show contract send dialog after assigning
      if (newStatus === 'assigned' && volunteer) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.contract_template_id) {
          setContractConfirm({ volunteer, task });
        }
      }
    }
    setUpdatingSignup(null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newTask.title.trim() || !selectedTemplateId) return;

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
      expense_reimbursement: newTask.expense_reimbursement,
      expense_amount: newTask.expense_reimbursement && newTask.expense_amount
        ? parseFloat(newTask.expense_amount)
        : null,
      contract_template_id: selectedTemplateId,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData as any)
      .select('id, title, description, task_date, location, spots_available, status, club_id')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      toast.success(dt.taskCreated);
      setTasks(prev => [...prev, data]);
      setShowCreateForm(false);
      setSelectedTemplateId('');
      setNewTask({
        title: '', description: '', task_date: '', location: '', spots_available: 1,
        briefing_time: '', briefing_location: '', start_time: '', end_time: '',
        notes: '', expense_reimbursement: false, expense_amount: '',
      });
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
      expense_reimbursement: editForm.expense_reimbursement,
      expense_amount: editForm.expense_reimbursement && editForm.expense_amount ? parseFloat(editForm.expense_amount) : null,
      contract_template_id: editForm.contract_template_id || null,
    };
    const { error } = await supabase.from('tasks').update(updateData as any).eq('id', editingTask.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dt.taskUpdated);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? {
        ...t,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        task_date: editForm.task_date || null,
        location: editForm.location.trim() || null,
        spots_available: editForm.spots_available,
        contract_template_id: editForm.contract_template_id || null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {clubInfo?.logo_url ? (
              <img src={clubInfo.logo_url} alt={clubInfo.name} className="w-9 h-9 rounded-xl object-cover border border-border" />
            ) : (
              <Logo size="sm" linkTo="/club-dashboard" showText={false} />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-heading font-semibold text-foreground leading-tight">{clubInfo?.name || dt.title}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {clubInfo?.sport && <span>{clubInfo.sport}</span>}
                {clubInfo?.sport && clubInfo?.location && <span>·</span>}
                {clubInfo?.location && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {clubInfo.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:block">
              {profile?.full_name || profile?.email}
            </span>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{dt.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">{dt.title}</h1>
            <p className="text-muted-foreground mt-1">{dt.myTasks}: {tasks.length}</p>
          </div>
          {clubId && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? dt.cancel : dt.newTask}
            </button>
          )}
        </motion.div>

        {/* Quick access cards */}
        {clubId && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6"
          >
            <button
              onClick={() => navigate('/chat')}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <Bell className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium text-foreground">Notificaties</span>
            </button>
            {(isOwner || myClubRole === 'bestuurder') && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <Settings className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-foreground">Instellingen</span>
              </button>
            )}
            {(isOwner || myClubRole === 'bestuurder' || myClubRole === 'beheerder') && (
              <button
                onClick={() => setShowTemplates(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-foreground">Contracten</span>
              </button>
            )}
            {(isOwner || myClubRole === 'bestuurder' || myClubRole === 'beheerder') && (
              <button
                onClick={() => navigate('/payments')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <CreditCard className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-foreground">Betalingen</span>
              </button>
            )}
            {(isOwner || myClubRole === 'bestuurder' || myClubRole === 'beheerder') && (
              <button
                onClick={() => setShowMembers(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <Shield className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-foreground">Leden</span>
              </button>
            )}
          </motion.div>
        )}

        {/* Create task form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateTask}
              className="mt-4 bg-card rounded-2xl shadow-card border border-border p-6 overflow-hidden"
            >
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{dt.newTask}</h2>

              {/* Contract template selection */}
              <div className="mb-4">
                <label className={labelClass}>{dt.contractTemplate} *</label>
                {contractTemplates.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <span>{dt.noTemplatesYet}</span>
                    <button
                      type="button"
                      onClick={() => setShowTemplates(true)}
                      className="text-primary underline hover:opacity-80"
                    >
                      {dt.manageTemplates}
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{dt.selectTemplate}</option>
                    {contractTemplates.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title - full width */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>{dt.taskTitle} *</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={newTask.title}
                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                {/* Description - full width */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>{dt.taskDescription}</label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={newTask.description}
                    onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                    className={inputClass + ' resize-none'}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskDate}</label>
                  <input
                    type="datetime-local"
                    value={newTask.task_date}
                    onChange={e => setNewTask(p => ({ ...p, task_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskLocation}</label>
                  <input
                    type="text"
                    maxLength={300}
                    value={newTask.location}
                    onChange={e => setNewTask(p => ({ ...p, location: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskSpots}</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={newTask.spots_available}
                    onChange={e => setNewTask(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskBriefingLocation}</label>
                  <input
                    type="text"
                    maxLength={300}
                    value={newTask.briefing_location}
                    onChange={e => setNewTask(p => ({ ...p, briefing_location: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskBriefingTime}</label>
                  <input
                    type="datetime-local"
                    value={newTask.briefing_time}
                    onChange={e => setNewTask(p => ({ ...p, briefing_time: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskStartTime}</label>
                  <input
                    type="datetime-local"
                    value={newTask.start_time}
                    onChange={e => setNewTask(p => ({ ...p, start_time: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskEndTime}</label>
                  <input
                    type="datetime-local"
                    value={newTask.end_time}
                    onChange={e => setNewTask(p => ({ ...p, end_time: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{dt.taskNotes}</label>
                  <input
                    type="text"
                    maxLength={500}
                    value={newTask.notes}
                    onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                {/* Expense reimbursement */}
                <div className="sm:col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTask.expense_reimbursement}
                      onChange={e => setNewTask(p => ({ ...p, expense_reimbursement: e.target.checked }))}
                      className="w-4 h-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm text-foreground">{dt.taskExpenseReimbursement}</span>
                  </label>
                  {newTask.expense_reimbursement && (
                    <input
                      type="number"
                      min={1}
                      step={0.01}
                      placeholder={dt.taskExpenseAmount}
                      value={newTask.expense_amount}
                      onChange={e => setNewTask(p => ({ ...p, expense_amount: e.target.value }))}
                      className={inputClass + ' max-w-[150px]'}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {dt.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !newTask.title.trim() || !selectedTemplateId}
                  className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {creatingTask ? dt.creating : dt.create}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Tasks list */}
        <div className="mt-6 space-y-4">
          {tasks.length === 0 && !showCreateForm ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{dt.noTasks}</p>
            </div>
          ) : (
            tasks.map((task, i) => {
              const taskSignups = signups[task.id] || [];
              const pendingCount = taskSignups.filter(s => s.status === 'pending').length;
              const assignedCount = taskSignups.filter(s => s.status === 'assigned').length;
              const isExpanded = expandedTask === task.id;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl shadow-card border border-transparent overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                    className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-foreground">{task.title}</h3>
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
                        {task.contract_templates?.name && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {task.contract_templates.name}
                          </span>
                        )}
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

                  {/* Edit/Delete buttons */}
                  {isExpanded && (
                    <div className="flex items-center gap-2 px-5 pt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(task); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {dt.editTask}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteTask(task.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {dt.deleteTask}
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
                                signup.status === 'assigned'
                                  ? 'bg-accent/10 border border-accent/20'
                                  : 'bg-muted/30 border border-transparent'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => signup.volunteer && setSelectedVolunteer({
                                  volunteer: signup.volunteer,
                                  signupStatus: signup.status,
                                  signedUpAt: signup.signed_up_at,
                                })}
                                className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
                              >
                                <Avatar className="w-9 h-9 shrink-0">
                                  {signup.volunteer?.avatar_url && (
                                    <AvatarImage src={signup.volunteer.avatar_url} alt={signup.volunteer.full_name || ''} />
                                  )}
                                  <AvatarFallback className={`text-xs font-bold ${
                                    signup.status === 'assigned'
                                      ? 'bg-accent/20 text-accent-foreground'
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {(signup.volunteer?.full_name || signup.volunteer?.email || '?')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {signup.volunteer?.full_name || 'Onbekend'}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {signup.volunteer?.email || ''}
                                  </p>
                                </div>
                              </button>

                              <div className="flex items-center gap-2 shrink-0">
                                {signup.status === 'assigned' ? (
                                  <>
                                    <span className="flex items-center gap-1 text-xs font-medium text-accent-foreground">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      {dt.assigned}
                                    </span>
                                    {(() => {
                                      const payKey = `${signup.task_id}-${signup.volunteer_id}`;
                                      const payment = volunteerPayments[payKey];
                                      const sigInfo = signatureStatuses[payKey];
                                      const contractSigned = sigInfo?.status === 'completed';
                                      const volHasStripe = !!volunteerStripeIds[signup.volunteer_id];
                                      const canPay = clubStripeId && volHasStripe && contractSigned && (!payment || payment.status === 'failed');

                                      if (payment && payment.status === 'succeeded') {
                                        return (
                                          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                            <CheckCircle className="w-3.5 h-3.5" /> Betaald
                                            {payment.receipt_url && (
                                              <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer" className="ml-1">
                                                <Download className="w-3 h-3" />
                                              </a>
                                            )}
                                          </span>
                                        );
                                      }
                                      if (payment && payment.status === 'processing') {
                                        return (
                                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                                            <Clock className="w-3.5 h-3.5" /> Verwerken
                                          </span>
                                        );
                                      }
                                      if (contractSigned && sigInfo?.document_url) {
                                        return (
                                          <div className="flex items-center gap-1">
                                            <a
                                              href={sigInfo.document_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                              title="Download ondertekend contract"
                                            >
                                              <Download className="w-3 h-3" />
                                              Contract
                                            </a>
                                            {canPay && (
                                              <button
                                                onClick={() => handleSendPayment(signup.task_id, signup.volunteer_id)}
                                                disabled={sendingPayment === payKey}
                                                className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                              >
                                                {sendingPayment === payKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                Betaal
                                              </button>
                                            )}
                                          </div>
                                        );
                                      }
                                      if (!contractSigned) {
                                        const contractKey = `${signup.task_id}-${signup.volunteer_id}`;
                                        const isSending = sendingContract === contractKey;
                                        return (
                                          <button
                                            onClick={async () => {
                                              setSendingContract(contractKey);
                                              try {
                                                // Look up the docuseal_template_id from the task's contract_template_id
                                                const tmplId = task.contract_template_id;
                                                if (!tmplId) {
                                                  toast.error('Geen contractsjabloon gekoppeld aan deze taak.');
                                                  setSendingContract(null);
                                                  return;
                                                }
                                                const { data: tmpl } = await supabase
                                                  .from('contract_templates')
                                                  .select('docuseal_template_id')
                                                  .eq('id', tmplId)
                                                  .maybeSingle();
                                                if (!tmpl) {
                                                  toast.error('Contractsjabloon niet gevonden.');
                                                  setSendingContract(null);
                                                  return;
                                                }
                                                const { data: { session: sess } } = await supabase.auth.getSession();
                                                if (!sess) { setSendingContract(null); return; }
                                                const resp = await fetch(
                                                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-submission`,
                                                  {
                                                    method: 'POST',
                                                    headers: {
                                                      'Authorization': `Bearer ${sess.access_token}`,
                                                      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                                                      'Content-Type': 'application/json',
                                                    },
                                                    body: JSON.stringify({
                                                      template_id: tmpl.docuseal_template_id,
                                                      task_id: signup.task_id,
                                                      volunteer_email: signup.volunteer?.email,
                                                      volunteer_name: signup.volunteer?.full_name,
                                                    }),
                                                  }
                                                );
                                                const result = await resp.json();
                                                if (resp.ok && result.success) {
                                                  toast.success('Contract verstuurd naar vrijwilliger!');
                                                  setSignatureStatuses(prev => ({
                                                    ...prev,
                                                    [contractKey]: { status: 'pending' },
                                                  }));
                                                } else {
                                                  toast.error(result.error || 'Er ging iets mis bij het versturen.');
                                                }
                                              } catch (err: any) {
                                                toast.error(err.message || 'Er ging iets mis.');
                                              }
                                              setSendingContract(null);
                                            }}
                                            disabled={isSending}
                                            className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                          >
                                            {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSignature className="w-3 h-3" />}
                                            Contract
                                          </button>
                                         );
                                      }
                                      if (canPay) {
                                        return (
                                          <button
                                            onClick={() => handleSendPayment(signup.task_id, signup.volunteer_id)}
                                            disabled={sendingPayment === payKey}
                                            className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                          >
                                            {sendingPayment === payKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                            Betaal
                                          </button>
                                        );
                                      }
                                      return null;
                                    })()}
                                    <button
                                      onClick={() => handleUpdateStatus(signup.id, signup.task_id, 'pending')}
                                      disabled={updatingSignup === signup.id}
                                      className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                                    >
                                      {dt.unassign}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="w-3.5 h-3.5" />
                                      {dt.pending}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateStatus(signup.id, signup.task_id, 'assigned', signup.volunteer)}
                                      disabled={updatingSignup === signup.id}
                                      className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
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
            })
          )}
        </div>
      </main>

      {/* Dialogs */}
      {showSettings && clubId && clubInfo && (
        <ClubSettingsDialog
          clubId={clubId}
          clubInfo={clubInfo}
          onClose={() => setShowSettings(false)}
          onUpdated={(info) => setClubInfo(info)}
        />
      )}

      {showMembers && clubId && (
        <ClubMembersDialog
          clubId={clubId}
          currentUserId={currentUserId}
          isOwner={isOwner}
          currentUserRole={myClubRole}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showTemplates && clubId && (
        <ContractTemplatesDialog
          clubId={clubId}
          language={language}
          onClose={() => {
            setShowTemplates(false);
            // Refresh templates list
            supabase
              .from('contract_templates')
              .select('id, name')
              .eq('club_id', clubId)
              .order('created_at', { ascending: false })
              .then(({ data }) => setContractTemplates(data || []));
          }}
        />
      )}

      <VolunteerProfileDialog
        volunteer={selectedVolunteer?.volunteer || null}
        open={!!selectedVolunteer}
        onOpenChange={(open) => !open && setSelectedVolunteer(null)}
        language={language}
        signupStatus={selectedVolunteer?.signupStatus}
        signedUpAt={selectedVolunteer?.signedUpAt}
      />

      {contractConfirm && contractConfirm.volunteer && (
        <SendContractConfirmDialog
          open={!!contractConfirm}
          onOpenChange={(open) => !open && setContractConfirm(null)}
          volunteer={{
            id: contractConfirm.volunteer.id,
            full_name: contractConfirm.volunteer.full_name,
            email: contractConfirm.volunteer.email,
            phone: contractConfirm.volunteer.phone,
            bank_iban: contractConfirm.volunteer.bank_iban,
            bank_holder_name: contractConfirm.volunteer.bank_holder_name,
          }}
          task={{
            id: contractConfirm.task.id,
            title: contractConfirm.task.title,
            task_date: contractConfirm.task.task_date,
            location: contractConfirm.task.location,
            contract_template_id: contractConfirm.task.contract_template_id,
          }}
          clubId={clubId || undefined}
          clubName={clubInfo?.name}
          language={language}
          onSent={() => {
            const key = `${contractConfirm.task.id}-${contractConfirm.volunteer!.id}`;
            setSignatureStatuses(prev => ({ ...prev, [key]: { status: 'pending' } }));
            setContractConfirm(null);
          }}
        />
      )}

      {/* Edit Task Dialog */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingTask(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">{dt.editTask}</h2>
                <button onClick={() => setEditingTask(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className={labelClass}>{dt.contractTemplate}</label>
                  <select
                    value={editForm.contract_template_id}
                    onChange={e => setEditForm(p => ({ ...p, contract_template_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">{dt.selectTemplate}</option>
                    {contractTemplates.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
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
                  <div>
                    <label className={labelClass}>{dt.taskDate}</label>
                    <input type="datetime-local" value={editForm.task_date} onChange={e => setEditForm(p => ({ ...p, task_date: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskLocation}</label>
                    <input type="text" maxLength={300} value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskSpots}</label>
                    <input type="number" min={1} max={999} value={editForm.spots_available} onChange={e => setEditForm(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskBriefingLocation}</label>
                    <input type="text" maxLength={300} value={editForm.briefing_location} onChange={e => setEditForm(p => ({ ...p, briefing_location: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskBriefingTime}</label>
                    <input type="datetime-local" value={editForm.briefing_time} onChange={e => setEditForm(p => ({ ...p, briefing_time: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskStartTime}</label>
                    <input type="datetime-local" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskEndTime}</label>
                    <input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{dt.taskNotes}</label>
                    <input type="text" maxLength={500} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} />
                  </div>
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
                  <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {dt.cancel}
                  </button>
                  <button type="submit" disabled={savingTask || !editForm.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {savingTask ? dt.saving : dt.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {confirmDeleteTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteTask(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h2 className="text-lg font-heading font-semibold text-foreground">{dt.deleteTask}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{dt.deleteConfirm}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteTask(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  {dt.cancel}
                </button>
                <button
                  onClick={() => handleDeleteTask(confirmDeleteTask)}
                  disabled={deletingTask === confirmDeleteTask}
                  className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {deletingTask === confirmDeleteTask ? <Loader2 className="w-4 h-4 animate-spin" /> : dt.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClubOwnerDashboard;
