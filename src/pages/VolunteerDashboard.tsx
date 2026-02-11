import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, LogOut, Search, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { Language } from '@/i18n/translations';


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
}

interface TaskSignup {
  task_id: string;
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
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(profileData);

      // Fetch tasks with club info
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, clubs(name, sport, location)')
        .eq('status', 'open')
        .order('task_date', { ascending: true });
      
      if (tasksError) {
        console.error('Tasks error:', tasksError);
      } else {
        setTasks(tasksData || []);
        // Fetch signup counts for all tasks
        if (tasksData && tasksData.length > 0) {
          const taskIds = tasksData.map(t => t.id);
          const { data: countData } = await supabase
            .from('task_signups')
            .select('task_id')
            .in('task_id', taskIds);
          if (countData) {
            const counts: Record<string, number> = {};
            countData.forEach(s => { counts[s.task_id] = (counts[s.task_id] || 0) + 1; });
            setSignupCounts(counts);
          }
        }
      }

      // Fetch user signups
      const { data: signupsData } = await supabase
        .from('task_signups')
        .select('task_id')
        .eq('volunteer_id', session.user.id);
      setSignups(signupsData || []);

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate('/login');
    });

    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignup = async (taskId: string) => {
    setSigningUp(taskId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('task_signups').insert({
      task_id: taskId,
      volunteer_id: session.user.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.volunteer.step3Title + '!');
      setSignups(prev => [...prev, { task_id: taskId }]);
      setSignupCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
    }
    setSigningUp(null);
  };

  const handleCancelSignup = async (taskId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('task_signups')
      .delete()
      .eq('task_id', taskId)
      .eq('volunteer_id', session.user.id);

    if (error) {
      toast.error(error.message);
    } else {
      setSignups(prev => prev.filter(s => s.task_id !== taskId));
      setSignupCounts(prev => ({ ...prev, [taskId]: Math.max((prev[taskId] || 1) - 1, 0) }));
    }
  };

  const isSignedUp = (taskId: string) => signups.some(s => s.task_id === taskId);

  const filteredTasks = tasks.filter(task => {
    const q = searchQuery.toLowerCase();
    return !q || task.title.toLowerCase().includes(q) || 
      task.description?.toLowerCase().includes(q) ||
      task.clubs?.name.toLowerCase().includes(q) ||
      task.clubs?.sport?.toLowerCase().includes(q) ||
      task.location?.toLowerCase().includes(q);
  });

  const dashboardT = {
    nl: { welcome: 'Welkom', availableTasks: 'Beschikbare taken', searchPlaceholder: 'Zoek taken, clubs of locaties...', noTasks: 'Er zijn momenteel geen openstaande taken.', signUp: 'Inschrijven', signedUp: 'Ingeschreven', cancel: 'Annuleren', spots: 'plaatsen', logout: 'Uitloggen', mySignups: 'Mijn inschrijvingen' },
    fr: { welcome: 'Bienvenue', availableTasks: 'Tâches disponibles', searchPlaceholder: 'Rechercher des tâches, clubs ou lieux...', noTasks: 'Il n\'y a actuellement aucune tâche disponible.', signUp: 'S\'inscrire', signedUp: 'Inscrit', cancel: 'Annuler', spots: 'places', logout: 'Déconnexion', mySignups: 'Mes inscriptions' },
    en: { welcome: 'Welcome', availableTasks: 'Available tasks', searchPlaceholder: 'Search tasks, clubs or locations...', noTasks: 'There are currently no open tasks.', signUp: 'Sign up', signedUp: 'Signed up', cancel: 'Cancel', spots: 'spots', logout: 'Log out', mySignups: 'My signups' },
  };
  const dt = dashboardT[language];

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
          <Logo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {(['nl', 'fr', 'en'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    language === lang ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {langLabels[lang]}
                </button>
              ))}
            </div>
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
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {dt.welcome}, {profile?.full_name || profile?.email || ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">{dt.availableTasks}: {filteredTasks.length}</p>
        </motion.div>

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={dt.searchPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* My signups summary */}
        {signups.length > 0 && (
          <div className="mt-6 bg-primary/5 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{dt.mySignups}: {signups.length}</span>
            </div>
          </div>
        )}

        {/* Tasks list */}
        <div className="mt-6 space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{dt.noTasks}</p>
            </div>
          ) : (
            filteredTasks.map((task, i) => {
              const signed = isSignedUp(task.id);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/task/${task.id}`)}
                  className={`bg-card rounded-2xl p-5 shadow-card border transition-all cursor-pointer ${
                    signed ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:shadow-elevated'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                          {task.clubs?.sport || task.clubs?.name}
                        </span>
                        {task.clubs?.name && (
                          <span className="text-xs text-muted-foreground">{task.clubs.name}</span>
                        )}
                      </div>
                      <h3 className="font-heading font-semibold text-foreground">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        {task.task_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { 
                              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        )}
                        {(task.location || task.clubs?.location) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {task.location || task.clubs?.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {signupCounts[task.id] || 0}/{task.spots_available} {dt.spots}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {signed ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/30 text-primary bg-primary/5">
                          ✓ {dt.signedUp}
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">
                          {dt.signUp} →
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

      </main>
    </div>
  );
};

export default VolunteerDashboard;
