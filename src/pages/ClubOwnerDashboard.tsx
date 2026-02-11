import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Users, Calendar, MapPin, LogOut, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import Logo from '@/components/Logo';
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

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(profileData);

      // Get club(s) for this owner
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id')
        .eq('owner_id', session.user.id);

      if (!clubs || clubs.length === 0) {
        setLoading(false);
        return;
      }

      const clubIds = clubs.map(c => c.id);

      // Get tasks for these clubs
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, description, task_date, location, spots_available, status')
        .in('club_id', clubIds)
        .order('task_date', { ascending: true });

      setTasks(tasksData || []);

      // Get all signups for these tasks
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: signupsData } = await supabase
          .from('task_signups')
          .select('id, task_id, volunteer_id, status, signed_up_at')
          .in('task_id', taskIds);

        if (signupsData && signupsData.length > 0) {
          // Fetch volunteer profiles
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

  const langLabels: Record<Language, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

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
          <Logo size="sm" linkTo="/club-dashboard" />
          <div className="flex items-center gap-4">
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-foreground">{dt.title}</h1>
          <p className="text-muted-foreground mt-1">{dt.myTasks}: {tasks.length}</p>
        </motion.div>

        <div className="mt-6 space-y-4">
          {tasks.length === 0 ? (
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
                  {/* Task header */}
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

                  {/* Signups list */}
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
    </div>
  );
};

export default ClubOwnerDashboard;
