import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Gift, Users, Pencil, Star, X, Check,
  Trophy, Clock, ToggleLeft, ToggleRight,
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LoyaltyProgram {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  reward_description: string;
  required_tasks: number;
  required_points: number | null;
  points_based: boolean;
  is_active: boolean;
  created_at: string;
}

interface Enrollment {
  id: string;
  program_id: string;
  volunteer_id: string;
  tasks_completed: number;
  points_earned: number;
  reward_claimed: boolean;
  volunteer_name?: string;
  volunteer_email?: string;
}

type QueueItem = Enrollment & { program: LoyaltyProgram };

interface ClubTask {
  id: string;
  title: string;
  loyalty_eligible: boolean;
  loyalty_points: number | null;
}

const loyaltyT = {
  nl: {
    title: 'Loyaliteitsprogramma\'s',
    subtitle: 'Beloon trouwe vrijwilligers met een programma naar keuze.',
    newProgram: 'Nieuw programma',
    name: 'Naam',
    description: 'Beschrijving (optioneel)',
    reward: 'Beloning',
    rewardPlaceholder: 'bv. Gratis voetbalticket',
    requiredTasks: 'Aantal taken vereist',
    requiredPoints: 'Punten vereist',
    pointsBased: 'Punten-gebaseerd',
    tasksBased: 'Taken-gebaseerd',
    create: 'Aanmaken',
    cancel: 'Annuleren',
    save: 'Opslaan',
    delete: 'Verwijderen',
    deleteConfirm: 'Weet je zeker dat je dit programma wilt verwijderen?',
    active: 'Actief',
    inactive: 'Inactief',
    noPrograms: 'Nog geen loyaliteitsprogramma\'s aangemaakt.',
    enrollments: 'Deelnemers',
    noEnrollments: 'Nog geen deelnemers.',
    tasksCompleted: 'taken voltooid',
    pointsEarned: 'punten verdiend',
    rewardClaimed: 'Beloning opgeëist',
    rewardPending: 'Bezig',
    grantReward: 'Beloning toekennen',
    back: 'Terug naar dashboard',
    programCreated: 'Programma aangemaakt!',
    programUpdated: 'Programma bijgewerkt!',
    programDeleted: 'Programma verwijderd!',
    rewardGranted: 'Beloning toegekend!',
    excludedTasks: 'Uitgesloten taken',
    noExcludedTasks: 'Geen uitgesloten taken.',
    excludeTask: 'Taak uitsluiten',
    includedTasks: 'Beschikbare taken',
    points: 'punten',
    tasks: 'taken',
    tab_programs: 'Programma\'s',
    tab_queue: 'Beloningen',
    tab_settings: 'Taakinstellingen',
    kpi_active: 'Actieve programma\'s',
    kpi_participants: 'Deelnemers',
    kpi_pending: 'Wachten op beloning',
    kpi_granted: 'Beloningen toegekend',
    queue_empty: 'Geen openstaande beloningen — geweldig!',
    col_volunteer: 'Vrijwilliger',
    col_program: 'Programma',
    col_progress: 'Voortgang',
    task_settings_desc: 'Sluit specifieke taken uit van loyaliteitsprogramma\'s.',
    excluded_count: 'uitgesloten',
    editProgram: 'Programma bewerken',
  },
  fr: {
    title: 'Programmes de fidélité',
    subtitle: 'Récompensez les bénévoles fidèles avec un programme de votre choix.',
    newProgram: 'Nouveau programme',
    name: 'Nom',
    description: 'Description (optionnel)',
    reward: 'Récompense',
    rewardPlaceholder: 'ex. Billet de foot gratuit',
    requiredTasks: 'Nombre de tâches requises',
    requiredPoints: 'Points requis',
    pointsBased: 'Basé sur les points',
    tasksBased: 'Basé sur les tâches',
    create: 'Créer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce programme?',
    active: 'Actif',
    inactive: 'Inactif',
    noPrograms: 'Aucun programme de fidélité créé.',
    enrollments: 'Participants',
    noEnrollments: 'Aucun participant.',
    tasksCompleted: 'tâches terminées',
    pointsEarned: 'points gagnés',
    rewardClaimed: 'Récompense réclamée',
    rewardPending: 'En cours',
    grantReward: 'Accorder la récompense',
    back: 'Retour au tableau de bord',
    programCreated: 'Programme créé!',
    programUpdated: 'Programme mis à jour!',
    programDeleted: 'Programme supprimé!',
    rewardGranted: 'Récompense accordée!',
    excludedTasks: 'Tâches exclues',
    noExcludedTasks: 'Aucune tâche exclue.',
    excludeTask: 'Exclure une tâche',
    includedTasks: 'Tâches disponibles',
    points: 'points',
    tasks: 'tâches',
    tab_programs: 'Programmes',
    tab_queue: 'Récompenses',
    tab_settings: 'Paramètres des tâches',
    kpi_active: 'Programmes actifs',
    kpi_participants: 'Participants',
    kpi_pending: 'En attente de récompense',
    kpi_granted: 'Récompenses accordées',
    queue_empty: 'Aucune récompense en attente — excellent !',
    col_volunteer: 'Bénévole',
    col_program: 'Programme',
    col_progress: 'Progrès',
    task_settings_desc: 'Exclure des tâches spécifiques des programmes de fidélité.',
    excluded_count: 'exclues',
    editProgram: 'Modifier le programme',
  },
  en: {
    title: 'Loyalty Programs',
    subtitle: 'Reward loyal volunteers with a program of your choice.',
    newProgram: 'New program',
    name: 'Name',
    description: 'Description (optional)',
    reward: 'Reward',
    rewardPlaceholder: 'e.g. Free football ticket',
    requiredTasks: 'Tasks required',
    requiredPoints: 'Points required',
    pointsBased: 'Points-based',
    tasksBased: 'Tasks-based',
    create: 'Create',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this program?',
    active: 'Active',
    inactive: 'Inactive',
    noPrograms: 'No loyalty programs created yet.',
    enrollments: 'Participants',
    noEnrollments: 'No participants yet.',
    tasksCompleted: 'tasks completed',
    pointsEarned: 'points earned',
    rewardClaimed: 'Reward claimed',
    rewardPending: 'In progress',
    grantReward: 'Grant reward',
    back: 'Back to dashboard',
    programCreated: 'Program created!',
    programUpdated: 'Program updated!',
    programDeleted: 'Program deleted!',
    rewardGranted: 'Reward granted!',
    excludedTasks: 'Excluded tasks',
    noExcludedTasks: 'No excluded tasks.',
    excludeTask: 'Exclude task',
    includedTasks: 'Available tasks',
    points: 'points',
    tasks: 'tasks',
    tab_programs: 'Programs',
    tab_queue: 'Rewards',
    tab_settings: 'Task Settings',
    kpi_active: 'Active programs',
    kpi_participants: 'Participants',
    kpi_pending: 'Pending rewards',
    kpi_granted: 'Rewards granted',
    queue_empty: 'No pending rewards — great work!',
    col_volunteer: 'Volunteer',
    col_program: 'Program',
    col_progress: 'Progress',
    task_settings_desc: 'Exclude specific tasks from loyalty programs.',
    excluded_count: 'excluded',
    editProgram: 'Edit program',
  },
};

const LoyaltyPrograms = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dt = loyaltyT[language];

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [clubTasks, setClubTasks] = useState<ClubTask[]>([]);
  const [excludedTasks, setExcludedTasks] = useState<Record<string, Set<string>>>({});

  // Create sheet
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', description: '', reward_description: '', required_tasks: 10, points_based: true, required_points: 100 });

  // Edit sheet
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', reward_description: '', required_tasks: 10, points_based: true, required_points: 100 });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { clubId: contextClubId } = useClubContext();

  useEffect(() => {
    const init = async () => {
      if (!contextClubId) { navigate('/club-dashboard'); return; }
      setClubId(contextClubId);

      const { data: programsData } = await supabase.from('loyalty_programs').select('*').eq('club_id', contextClubId).order('created_at', { ascending: false });
      setPrograms(programsData || []);

      const { data: tasksData } = await supabase.from('tasks').select('id, title, loyalty_eligible, loyalty_points').eq('club_id', contextClubId);
      setClubTasks(tasksData || []);

      if (programsData && programsData.length > 0) {
        const programIds = programsData.map((p: any) => p.id);
        const { data: exclusions } = await supabase.from('loyalty_program_excluded_tasks').select('*').in('program_id', programIds);
        if (exclusions) {
          const exMap: Record<string, Set<string>> = {};
          exclusions.forEach((ex: any) => {
            if (!exMap[ex.program_id]) exMap[ex.program_id] = new Set();
            exMap[ex.program_id].add(ex.task_id);
          });
          setExcludedTasks(exMap);
        }

        const { data: enrollData } = await supabase.from('loyalty_enrollments').select('*').in('program_id', programIds);
        if (enrollData && enrollData.length > 0) {
          const volunteerIds = [...new Set(enrollData.map((e: any) => e.volunteer_id))] as string[];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', volunteerIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          const grouped: Record<string, Enrollment[]> = {};
          enrollData.forEach((e: any) => {
            const profile = profileMap.get(e.volunteer_id);
            const enriched = { ...e, volunteer_name: profile?.full_name || '', volunteer_email: profile?.email || '' };
            if (!grouped[e.program_id]) grouped[e.program_id] = [];
            grouped[e.program_id].push(enriched);
          });
          setEnrollments(grouped);
        }
      }

      setLoading(false);
    };
    init();
  }, [contextClubId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newProgram.name.trim() || !newProgram.reward_description.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from('loyalty_programs').insert({
      club_id: clubId,
      name: newProgram.name.trim(),
      description: newProgram.description.trim() || null,
      reward_description: newProgram.reward_description.trim(),
      required_tasks: newProgram.required_tasks,
      points_based: newProgram.points_based,
      required_points: newProgram.points_based ? newProgram.required_points : null,
    } as any).select('*').maybeSingle();
    if (error) { toast.error(error.message); }
    else if (data) {
      toast.success(dt.programCreated);
      setPrograms(prev => [data, ...prev]);
      setShowCreateForm(false);
      setNewProgram({ name: '', description: '', reward_description: '', required_tasks: 10, points_based: true, required_points: 100 });
    }
    setCreating(false);
  };

  const handleToggleActive = async (program: LoyaltyProgram) => {
    const { error } = await supabase.from('loyalty_programs').update({ is_active: !program.is_active }).eq('id', program.id);
    if (error) { toast.error(error.message); }
    else {
      setPrograms(prev => prev.map(p => p.id === program.id ? { ...p, is_active: !p.is_active } : p));
    }
  };

  const handleStartEdit = (program: LoyaltyProgram) => {
    setEditingProgram(program);
    setEditForm({
      name: program.name,
      description: program.description || '',
      reward_description: program.reward_description,
      required_tasks: program.required_tasks,
      points_based: program.points_based,
      required_points: program.required_points || 100,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    setSavingEdit(true);
    const { error } = await supabase.from('loyalty_programs').update({
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      reward_description: editForm.reward_description.trim(),
      required_tasks: editForm.required_tasks,
      points_based: editForm.points_based,
      required_points: editForm.points_based ? editForm.required_points : null,
    }).eq('id', editingProgram.id);
    if (error) { toast.error(error.message); }
    else {
      toast.success(dt.programUpdated);
      setPrograms(prev => prev.map(p => p.id === editingProgram.id ? {
        ...p,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        reward_description: editForm.reward_description.trim(),
        required_tasks: editForm.required_tasks,
        points_based: editForm.points_based,
        required_points: editForm.points_based ? editForm.required_points : null,
      } : p));
      setEditingProgram(null);
    }
    setSavingEdit(false);
  };

  const handleDelete = async (programId: string) => {
    setDeleting(true);
    const { error } = await supabase.from('loyalty_programs').delete().eq('id', programId);
    if (error) { toast.error(error.message); }
    else {
      toast.success(dt.programDeleted);
      setPrograms(prev => prev.filter(p => p.id !== programId));
      setConfirmDelete(null);
    }
    setDeleting(false);
  };

  const handleGrantReward = async (enrollment: Enrollment) => {
    const { error } = await supabase.from('loyalty_enrollments').update({ reward_claimed: true, claimed_at: new Date().toISOString() }).eq('id', enrollment.id);
    if (error) { toast.error(error.message); }
    else {
      toast.success(dt.rewardGranted);
      setEnrollments(prev => {
        const updated = { ...prev };
        if (updated[enrollment.program_id]) {
          updated[enrollment.program_id] = updated[enrollment.program_id].map(e => e.id === enrollment.id ? { ...e, reward_claimed: true } : e);
        }
        return updated;
      });
    }
  };

  const handleExcludeTask = async (programId: string, taskId: string) => {
    const { error } = await supabase.from('loyalty_program_excluded_tasks').insert({ program_id: programId, task_id: taskId });
    if (error) { toast.error(error.message); return; }
    setExcludedTasks(prev => {
      const updated = { ...prev };
      if (!updated[programId]) updated[programId] = new Set();
      updated[programId] = new Set(updated[programId]);
      updated[programId].add(taskId);
      return updated;
    });
  };

  const handleIncludeTask = async (programId: string, taskId: string) => {
    const { error } = await supabase.from('loyalty_program_excluded_tasks').delete().eq('program_id', programId).eq('task_id', taskId);
    if (error) { toast.error(error.message); return; }
    setExcludedTasks(prev => {
      const updated = { ...prev };
      if (updated[programId]) {
        updated[programId] = new Set(updated[programId]);
        updated[programId].delete(taskId);
      }
      return updated;
    });
  };

  const getRequirementLabel = (program: LoyaltyProgram) => {
    if (program.points_based && program.required_points) {
      return `${program.required_points} ${dt.points}`;
    }
    return `${program.required_tasks} ${dt.tasks}`;
  };

  const getProgress = (program: LoyaltyProgram, enrollment: Enrollment) => {
    if (program.points_based && program.required_points) {
      return Math.min(100, (enrollment.points_earned / program.required_points) * 100);
    }
    return Math.min(100, (enrollment.tasks_completed / program.required_tasks) * 100);
  };

  const getProgressLabel = (program: LoyaltyProgram, enrollment: Enrollment) => {
    if (program.points_based && program.required_points) {
      return `${enrollment.points_earned}/${program.required_points} ${dt.points}`;
    }
    return `${enrollment.tasks_completed}/${program.required_tasks}`;
  };

  const isGoalReached = (program: LoyaltyProgram, enrollment: Enrollment) => {
    if (program.points_based && program.required_points) {
      return enrollment.points_earned >= program.required_points;
    }
    return enrollment.tasks_completed >= program.required_tasks;
  };

  // Computed
  const allEnrollments = Object.values(enrollments).flat();
  const rewardQueue: QueueItem[] = allEnrollments
    .filter(e => { const p = programs.find(x => x.id === e.program_id); return p && isGoalReached(p, e) && !e.reward_claimed; })
    .map(e => ({ ...e, program: programs.find(x => x.id === e.program_id)! }));

  const kpis = [
    { label: dt.kpi_active, value: programs.filter(p => p.is_active).length, icon: Gift, bg: 'bg-primary/10', ic: 'text-primary' },
    { label: dt.kpi_participants, value: allEnrollments.length, icon: Users, bg: 'bg-blue-500/10', ic: 'text-blue-500' },
    { label: dt.kpi_pending, value: rewardQueue.length, icon: Clock, bg: 'bg-amber-500/10', ic: 'text-amber-500' },
    { label: dt.kpi_granted, value: allEnrollments.filter(e => e.reward_claimed).length, icon: Trophy, bg: 'bg-emerald-500/10', ic: 'text-emerald-500' },
  ];

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ProgramForm = ({
    form,
    setForm,
    onSubmit,
    saving,
    onCancel,
    submitLabel,
  }: {
    form: typeof newProgram;
    setForm: React.Dispatch<React.SetStateAction<typeof newProgram>>;
    onSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    onCancel: () => void;
    submitLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className={labelClass}>{dt.name} *</label>
        <input type="text" required maxLength={200} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{dt.description}</label>
        <textarea rows={2} maxLength={1000} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
      </div>
      <div>
        <label className={labelClass}>{dt.reward} *</label>
        <input type="text" required maxLength={300} placeholder={dt.rewardPlaceholder} value={form.reward_description} onChange={e => setForm(p => ({ ...p, reward_description: e.target.value }))} className={inputClass} />
      </div>

      {/* Points vs Tasks toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">{form.points_based ? dt.pointsBased : dt.tasksBased}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{form.points_based ? dt.requiredPoints : dt.requiredTasks}</p>
        </div>
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, points_based: !p.points_based }))}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {form.points_based
            ? <ToggleRight className="w-7 h-7 text-primary" />
            : <ToggleLeft className="w-7 h-7" />}
        </button>
      </div>

      {form.points_based ? (
        <div>
          <label className={labelClass}>{dt.requiredPoints} *</label>
          <input type="number" min={1} max={99999} value={form.required_points} onChange={e => setForm(p => ({ ...p, required_points: parseInt(e.target.value) || 1 }))} className={inputClass} />
        </div>
      ) : (
        <div>
          <label className={labelClass}>{dt.requiredTasks} *</label>
          <input type="number" min={1} max={9999} value={form.required_tasks} onChange={e => setForm(p => ({ ...p, required_tasks: parseInt(e.target.value) || 1 }))} className={inputClass} />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
          {dt.cancel}
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? '...' : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <ClubPageLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" /> {dt.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{dt.subtitle}</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> {dt.newProgram}
          </button>
        </motion.div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-colors"
            >
              <div className={cn('w-8 h-8 rounded-lg mx-auto mb-2.5 flex items-center justify-center', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.ic)} />
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="programs">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="programs" className="text-xs sm:text-sm">{dt.tab_programs}</TabsTrigger>
            <TabsTrigger value="queue" className="text-xs sm:text-sm gap-1.5">
              {dt.tab_queue}
              {rewardQueue.length > 0 && (
                <Badge className="h-4 px-1.5 text-[10px] rounded-full bg-amber-500 text-white border-0">
                  {rewardQueue.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">{dt.tab_settings}</TabsTrigger>
          </TabsList>

          {/* ── Programs Tab ── */}
          <TabsContent value="programs" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {programs.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <Gift className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{dt.noPrograms}</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1.5" />{dt.newProgram}
                  </button>
                </div>
              ) : (
                programs.map((program, i) => {
                  const programEnrollments = enrollments[program.id] || [];
                  const excluded = excludedTasks[program.id] || new Set();
                  const pendingCount = programEnrollments.filter(e => isGoalReached(program, e) && !e.reward_claimed).length;

                  return (
                    <motion.div
                      key={program.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              'w-2 h-2 rounded-full shrink-0 mt-0.5',
                              program.is_active
                                ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.35)]'
                                : 'bg-muted-foreground/30'
                            )} />
                            <h3 className="font-semibold text-foreground">{program.name}</h3>
                            <Badge variant={program.is_active ? 'default' : 'secondary'} className="text-[10px] h-[18px] px-1.5">
                              {program.is_active ? dt.active : dt.inactive}
                            </Badge>
                            {program.points_based ? (
                              <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 gap-0.5">
                                <Star className="w-2.5 h-2.5" /> {dt.pointsBased}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 gap-0.5">
                                <Check className="w-2.5 h-2.5" /> {dt.tasksBased}
                              </Badge>
                            )}
                          </div>
                          {program.description && (
                            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{program.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleToggleActive(program)}
                            title={program.is_active ? dt.inactive : dt.active}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            {program.is_active
                              ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                              : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleStartEdit(program)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(confirmDelete === program.id ? null : program.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="mt-4 flex items-center gap-3 flex-wrap text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Gift className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-foreground font-medium line-clamp-1">{program.reward_description}</span>
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-muted-foreground text-xs">{getRequirementLabel(program)}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Users className="w-3 h-3" /> {programEnrollments.length}
                        </span>
                        {pendingCount > 0 && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                              <Clock className="w-3 h-3" /> {pendingCount} {dt.rewardPending.toLowerCase()}
                            </span>
                          </>
                        )}
                        {excluded.size > 0 && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="text-xs text-muted-foreground">{excluded.size} {dt.excluded_count}</span>
                          </>
                        )}
                      </div>

                      {/* Delete confirm */}
                      <AnimatePresence>
                        {confirmDelete === program.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-destructive">{dt.deleteConfirm}</span>
                              <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(null)} className="px-3 py-1 text-xs rounded-lg bg-muted text-muted-foreground">{dt.cancel}</button>
                                <button onClick={() => handleDelete(program.id)} disabled={deleting} className="px-3 py-1 text-xs rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50">{dt.delete}</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </TabsContent>

          {/* ── Queue Tab ── */}
          <TabsContent value="queue" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {rewardQueue.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-foreground font-medium">{dt.queue_empty}</p>
                  <p className="text-sm text-muted-foreground mt-1">{dt.noEnrollments}</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{dt.col_volunteer}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{dt.col_program}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">{dt.col_progress}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rewardQueue.map((item, i) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {item.volunteer_name || item.volunteer_email || 'Vrijwilliger'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Gift className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate max-w-[140px]">{item.program.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <Progress value={getProgress(item.program, item)} className="h-1.5 w-20" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{getProgressLabel(item.program, item)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleGrantReward(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium ml-auto whitespace-nowrap"
                              >
                                <Trophy className="w-3 h-3" />
                                {dt.grantReward}
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ── Settings Tab ── */}
          <TabsContent value="settings" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">{dt.task_settings_desc}</p>
              {programs.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                  {dt.noPrograms}
                </div>
              ) : (
                programs.map((program, i) => {
                  const excluded = excludedTasks[program.id] || new Set();
                  const eligibleTasks = clubTasks.filter(t => t.loyalty_eligible);
                  const includedTasks = eligibleTasks.filter(t => !excluded.has(t.id));
                  const excludedTasksList = clubTasks.filter(t => excluded.has(t.id));

                  return (
                    <motion.div
                      key={program.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-card border border-border rounded-xl p-5"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          program.is_active ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.35)]' : 'bg-muted-foreground/30'
                        )} />
                        <h3 className="font-semibold text-foreground">{program.name}</h3>
                        <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 ml-1">
                          {program.points_based ? dt.pointsBased : dt.tasksBased}
                        </Badge>
                        {excluded.size > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-[18px] px-1.5 ml-auto">
                            {excluded.size} {dt.excluded_count}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        {excludedTasksList.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-2">{dt.excludedTasks}</p>
                            <div className="flex flex-wrap gap-2">
                              {excludedTasksList.map(task => (
                                <button
                                  key={task.id}
                                  onClick={() => handleIncludeTask(program.id, task.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                >
                                  <X className="w-3 h-3" /> {task.title}
                                  {task.loyalty_points && <span className="text-[10px] opacity-70">({task.loyalty_points}pt)</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">{dt.includedTasks}</p>
                          {includedTasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">{dt.noExcludedTasks}</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {includedTasks.map(task => (
                                <button
                                  key={task.id}
                                  onClick={() => handleExcludeTask(program.id, task.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                                >
                                  <Check className="w-3 h-3 text-emerald-500" /> {task.title}
                                  {task.loyalty_points && <span className="text-[10px] opacity-70">({task.loyalty_points}pt)</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreateForm} onOpenChange={setShowCreateForm}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" /> {dt.newProgram}
            </SheetTitle>
          </SheetHeader>
          <ProgramForm
            form={newProgram}
            setForm={setNewProgram}
            onSubmit={handleCreate}
            saving={creating}
            onCancel={() => setShowCreateForm(false)}
            submitLabel={dt.create}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editingProgram} onOpenChange={open => { if (!open) setEditingProgram(null); }}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> {dt.editProgram}
            </SheetTitle>
          </SheetHeader>
          <ProgramForm
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleSaveEdit}
            saving={savingEdit}
            onCancel={() => setEditingProgram(null)}
            submitLabel={dt.save}
          />
        </SheetContent>
      </Sheet>
    </ClubPageLayout>
  );
};

export default LoyaltyPrograms;
