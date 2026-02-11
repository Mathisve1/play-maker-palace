import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, MapPin, LogOut, CheckCircle, Clock, ChevronDown, ChevronUp, Plus, X, Settings, Shield, FileText } from 'lucide-react';
import Logo from '@/components/Logo';
import ClubSettingsDialog from '@/components/ClubSettingsDialog';
import ClubMembersDialog from '@/components/ClubMembersDialog';
import NotificationBell from '@/components/NotificationBell';
import ContractTemplatesDialog from '@/components/ContractTemplatesDialog';
import { Language } from '@/i18n/translations';

interface Signup {
  id: string;
  task_id: string;
  volunteer_id: string;
  status: string;
  signed_up_at: string;
  volunteer?: { full_name: string | null; email: string | null };
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
  const [showMembers, setShowMembers] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [contractTemplates, setContractTemplates] = useState<{ id: string; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

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
        .select('id, name, sport, location, logo_url')
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
            .select('id, name, sport, location, logo_url')
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
        .select('id, title, description, task_date, location, spots_available, status, club_id')
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
            .select('id, full_name, email')
            .in('id', volunteerIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          const grouped: Record<string, Signup[]> = {};
          signupsData.forEach(s => {
            const vol = profileMap.get(s.volunteer_id);
            const signup: Signup = {
              ...s,
              volunteer: vol ? { full_name: vol.full_name, email: vol.email } : null,
            };
            if (!grouped[s.task_id]) grouped[s.task_id] = [];
            grouped[s.task_id].push(signup);
          });
          setSignups(grouped);
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

  const handleUpdateStatus = async (signupId: string, taskId: string, newStatus: string) => {
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
          <div className="flex items-center gap-1">
            {currentUserId && <NotificationBell userId={currentUserId} />}
            {(isOwner || myClubRole === 'bestuurder') && clubId && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Club instellingen"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            {(isOwner || myClubRole === 'bestuurder' || myClubRole === 'beheerder') && clubId && (
              <button
                onClick={() => setShowTemplates(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title={dt.manageTemplates}
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
            {(isOwner || myClubRole === 'bestuurder' || myClubRole === 'beheerder') && clubId && (
              <button
                onClick={() => setShowMembers(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Leden beheren"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
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
                      min={0}
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
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  signup.status === 'assigned'
                                    ? 'bg-accent/20 text-accent-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {(signup.volunteer?.full_name || signup.volunteer?.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {signup.volunteer?.full_name || 'Onbekend'}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {signup.volunteer?.email || ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {signup.status === 'assigned' ? (
                                  <>
                                    <span className="flex items-center gap-1 text-xs font-medium text-accent-foreground">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      {dt.assigned}
                                    </span>
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
                                      onClick={() => handleUpdateStatus(signup.id, signup.task_id, 'assigned')}
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
    </div>
  );
};

export default ClubOwnerDashboard;
