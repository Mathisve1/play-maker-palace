import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Gift, Users, Pencil, ArrowLeft, ToggleLeft, ToggleRight, Star, X, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { Language } from '@/i18n/translations';

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
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [clubTasks, setClubTasks] = useState<ClubTask[]>([]);
  const [excludedTasks, setExcludedTasks] = useState<Record<string, Set<string>>>({});

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', description: '', reward_description: '', required_tasks: 10, points_based: false, required_points: 100 });

  // Edit
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', reward_description: '', required_tasks: 10, points_based: false, required_points: 100 });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Task exclusion management
  const [managingExclusions, setManagingExclusions] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: ownedClubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id);
      let cId = ownedClubs?.[0]?.id || null;
      if (!cId) {
        const { data: memberships } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
        cId = memberships?.[0]?.club_id || null;
      }
      if (!cId) { navigate('/club-dashboard'); return; }
      setClubId(cId);

      // Load programs
      const { data: programsData } = await (supabase as any).from('loyalty_programs').select('*').eq('club_id', cId).order('created_at', { ascending: false });
      setPrograms(programsData || []);

      // Load club tasks
      const { data: tasksData } = await (supabase as any).from('tasks').select('id, title, loyalty_eligible, loyalty_points').eq('club_id', cId);
      setClubTasks(tasksData || []);

      // Load excluded tasks per program
      if (programsData && programsData.length > 0) {
        const programIds = programsData.map((p: any) => p.id);
        const { data: exclusions } = await (supabase as any).from('loyalty_program_excluded_tasks').select('*').in('program_id', programIds);
        if (exclusions) {
          const exMap: Record<string, Set<string>> = {};
          exclusions.forEach((ex: any) => {
            if (!exMap[ex.program_id]) exMap[ex.program_id] = new Set();
            exMap[ex.program_id].add(ex.task_id);
          });
          setExcludedTasks(exMap);
        }

        // Load enrollments
        const { data: enrollData } = await (supabase as any).from('loyalty_enrollments').select('*').in('program_id', programIds);
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
  }, [navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newProgram.name.trim() || !newProgram.reward_description.trim()) return;
    setCreating(true);
    const { data, error } = await (supabase as any).from('loyalty_programs').insert({
      club_id: clubId,
      name: newProgram.name.trim(),
      description: newProgram.description.trim() || null,
      reward_description: newProgram.reward_description.trim(),
      required_tasks: newProgram.required_tasks,
      points_based: newProgram.points_based,
      required_points: newProgram.points_based ? newProgram.required_points : null,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); }
    else if (data) {
      toast.success(dt.programCreated);
      setPrograms(prev => [data, ...prev]);
      setShowCreateForm(false);
      setNewProgram({ name: '', description: '', reward_description: '', required_tasks: 10, points_based: false, required_points: 100 });
    }
    setCreating(false);
  };

  const handleToggleActive = async (program: LoyaltyProgram) => {
    const { error } = await (supabase as any).from('loyalty_programs').update({ is_active: !program.is_active }).eq('id', program.id);
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
    const { error } = await (supabase as any).from('loyalty_programs').update({
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
    const { error } = await (supabase as any).from('loyalty_programs').delete().eq('id', programId);
    if (error) { toast.error(error.message); }
    else {
      toast.success(dt.programDeleted);
      setPrograms(prev => prev.filter(p => p.id !== programId));
      setConfirmDelete(null);
    }
    setDeleting(false);
  };

  const handleGrantReward = async (enrollment: Enrollment) => {
    const { error } = await (supabase as any).from('loyalty_enrollments').update({ reward_claimed: true, claimed_at: new Date().toISOString() }).eq('id', enrollment.id);
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
    const { error } = await (supabase as any).from('loyalty_program_excluded_tasks').insert({ program_id: programId, task_id: taskId });
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
    const { error } = await (supabase as any).from('loyalty_program_excluded_tasks').delete().eq('program_id', programId).eq('task_id', taskId);
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

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render the mode toggle for points vs tasks
  const renderModeToggle = (value: boolean, onChange: (v: boolean) => void) => (
    <div className="flex gap-2 mt-1">
      <button type="button" onClick={() => onChange(false)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${!value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
        {dt.tasksBased}
      </button>
      <button type="button" onClick={() => onChange(true)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
        <Star className="w-3.5 h-3.5" /> {dt.pointsBased}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/club-dashboard" />
          <button onClick={() => navigate('/club-dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {dt.back}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" /> {dt.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{dt.subtitle}</p>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> {dt.newProgram}
          </button>
        </motion.div>

        {/* Create form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleCreate} className="mt-6 bg-card rounded-2xl shadow-card border border-border p-6 overflow-hidden">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{dt.newProgram}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>{dt.name} *</label>
                  <input type="text" required maxLength={200} value={newProgram.name} onChange={e => setNewProgram(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>{dt.description}</label>
                  <textarea rows={2} maxLength={1000} value={newProgram.description} onChange={e => setNewProgram(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
                </div>
                <div>
                  <label className={labelClass}>{dt.reward} *</label>
                  <input type="text" required maxLength={300} placeholder={dt.rewardPlaceholder} value={newProgram.reward_description} onChange={e => setNewProgram(p => ({ ...p, reward_description: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{language === 'nl' ? 'Type programma' : language === 'fr' ? 'Type de programme' : 'Program type'}</label>
                  {renderModeToggle(newProgram.points_based, v => setNewProgram(p => ({ ...p, points_based: v })))}
                </div>
                {newProgram.points_based ? (
                  <div>
                    <label className={labelClass}>{dt.requiredPoints} *</label>
                    <input type="number" min={1} max={99999} value={newProgram.required_points} onChange={e => setNewProgram(p => ({ ...p, required_points: parseInt(e.target.value) || 1 }))} className={inputClass} />
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>{dt.requiredTasks}</label>
                    <input type="number" min={1} max={999} value={newProgram.required_tasks} onChange={e => setNewProgram(p => ({ ...p, required_tasks: parseInt(e.target.value) || 1 }))} className={inputClass} />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{dt.cancel}</button>
                <button type="submit" disabled={creating} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {creating ? '...' : dt.create}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Programs list */}
        <div className="mt-6 space-y-4">
          {programs.length === 0 && !showCreateForm && (
            <div className="bg-card rounded-2xl shadow-card border border-transparent p-8 text-center text-muted-foreground">{dt.noPrograms}</div>
          )}
          {programs.map((program, i) => {
            const programEnrollments = enrollments[program.id] || [];
            const isExpanded = expandedProgram === program.id;
            const excluded = excludedTasks[program.id] || new Set();
            const eligibleTasks = clubTasks.filter(t => t.loyalty_eligible);
            const includedTasks = eligibleTasks.filter(t => !excluded.has(t.id));
            const excludedTasksList = clubTasks.filter(t => excluded.has(t.id));

            return (
              <motion.div key={program.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card rounded-2xl shadow-card border border-transparent overflow-hidden">
                <button onClick={() => setExpandedProgram(isExpanded ? null : program.id)} className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">{program.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${program.is_active ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {program.is_active ? dt.active : dt.inactive}
                      </span>
                      {program.points_based && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          <Star className="w-3 h-3" /> {dt.pointsBased}
                        </span>
                      )}
                    </div>
                    {program.description && <p className="text-xs text-muted-foreground mt-1">{program.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>🎁 {program.reward_description}</span>
                      <span>{getRequirementLabel(program)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {programEnrollments.length}</span>
                      {excluded.size > 0 && <span className="text-destructive">{excluded.size} {language === 'nl' ? 'uitgesloten' : language === 'fr' ? 'exclues' : 'excluded'}</span>}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3">
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => handleToggleActive(program)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        {program.is_active ? <ToggleRight className="w-3.5 h-3.5 text-accent" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {program.is_active ? dt.inactive : dt.active}
                      </button>
                      <button onClick={() => handleStartEdit(program)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> {dt.save}
                      </button>
                      <button onClick={() => setManagingExclusions(managingExclusions === program.id ? null : program.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" /> {dt.excludedTasks} ({excluded.size})
                      </button>
                      <button onClick={() => setConfirmDelete(program.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> {dt.delete}
                      </button>
                    </div>

                    {/* Task exclusion management */}
                    {managingExclusions === program.id && (
                      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                        {/* Excluded tasks */}
                        {excludedTasksList.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-2">{dt.excludedTasks}</p>
                            <div className="flex flex-wrap gap-2">
                              {excludedTasksList.map(task => (
                                <button key={task.id} onClick={() => handleIncludeTask(program.id, task.id)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                                  <X className="w-3 h-3" /> {task.title}
                                  {task.loyalty_points && <span className="text-[10px] opacity-70">({task.loyalty_points}pt)</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Includable tasks */}
                        <div>
                          <p className="text-xs font-medium text-foreground mb-2">{dt.includedTasks}</p>
                          {includedTasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">{dt.noExcludedTasks}</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {includedTasks.map(task => (
                                <button key={task.id} onClick={() => handleExcludeTask(program.id, task.id)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
                                  <Check className="w-3 h-3 text-accent" /> {task.title}
                                  {task.loyalty_points && <span className="text-[10px] opacity-70">({task.loyalty_points}pt)</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delete confirm */}
                    {confirmDelete === program.id && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-xs text-destructive">{dt.deleteConfirm}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmDelete(null)} className="px-3 py-1 text-xs rounded-lg bg-muted text-muted-foreground">{dt.cancel}</button>
                          <button onClick={() => handleDelete(program.id)} disabled={deleting} className="px-3 py-1 text-xs rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50">{dt.delete}</button>
                        </div>
                      </div>
                    )}

                    {/* Enrollments */}
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">{dt.enrollments}</h4>
                      {programEnrollments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{dt.noEnrollments}</p>
                      ) : (
                        <div className="space-y-2">
                          {programEnrollments.map(enrollment => (
                            <div key={enrollment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                              <div>
                                <p className="text-sm font-medium text-foreground">{enrollment.volunteer_name || enrollment.volunteer_email || 'Vrijwilliger'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-muted rounded-full h-2 w-32">
                                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${getProgress(program, enrollment)}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{getProgressLabel(program, enrollment)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {enrollment.reward_claimed ? (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/20 text-accent-foreground">✅ {dt.rewardClaimed}</span>
                                ) : isGoalReached(program, enrollment) ? (
                                  <button onClick={() => handleGrantReward(enrollment)} className="px-2.5 py-1 text-[10px] rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                                    🎁 {dt.grantReward}
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground">{dt.rewardPending}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Edit dialog */}
      <AnimatePresence>
        {editingProgram && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditingProgram(null)}>
            <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} onSubmit={handleSaveEdit} className="bg-card rounded-2xl shadow-elevated border border-border p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">{dt.name}</h2>
              <div>
                <label className={labelClass}>{dt.name} *</label>
                <input type="text" required maxLength={200} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{dt.description}</label>
                <textarea rows={2} maxLength={1000} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className={labelClass}>{dt.reward} *</label>
                <input type="text" required maxLength={300} value={editForm.reward_description} onChange={e => setEditForm(p => ({ ...p, reward_description: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{language === 'nl' ? 'Type programma' : language === 'fr' ? 'Type de programme' : 'Program type'}</label>
                {renderModeToggle(editForm.points_based, v => setEditForm(p => ({ ...p, points_based: v })))}
              </div>
              {editForm.points_based ? (
                <div>
                  <label className={labelClass}>{dt.requiredPoints} *</label>
                  <input type="number" min={1} max={99999} value={editForm.required_points} onChange={e => setEditForm(p => ({ ...p, required_points: parseInt(e.target.value) || 1 }))} className={inputClass} />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>{dt.requiredTasks}</label>
                  <input type="number" min={1} max={999} value={editForm.required_tasks} onChange={e => setEditForm(p => ({ ...p, required_tasks: parseInt(e.target.value) || 1 }))} className={inputClass} />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingProgram(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{dt.cancel}</button>
                <button type="submit" disabled={savingEdit} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">{savingEdit ? '...' : dt.save}</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoyaltyPrograms;
