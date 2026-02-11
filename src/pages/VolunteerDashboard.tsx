import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, LogOut, Search, CheckCircle, Heart, MessageCircle, FileSignature, User } from 'lucide-react';
import Logo from '@/components/Logo';
import LikeButton from '@/components/LikeButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import EditProfileDialog from '@/components/EditProfileDialog';
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
  status: string;
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
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [mineSubTab, setMineSubTab] = useState<'pending' | 'assigned'>('pending');
  const [signingContract, setSigningContract] = useState<string | null>(null);
  
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
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

          // Fetch like counts
          const { data: likeData } = await supabase
            .from('task_likes')
            .select('task_id')
            .in('task_id', taskIds);
          if (likeData) {
            const lCounts: Record<string, number> = {};
            likeData.forEach(l => { lCounts[l.task_id] = (lCounts[l.task_id] || 0) + 1; });
            setLikeCounts(lCounts);
          }

          // Fetch user's likes
          const { data: myLikeData } = await supabase
            .from('task_likes')
            .select('task_id')
            .eq('user_id', session.user.id);
          if (myLikeData) {
            setMyLikes(new Set(myLikeData.map(l => l.task_id)));
          }
        }
      }

      // Fetch user signups
      const { data: signupsData } = await supabase
        .from('task_signups')
        .select('task_id, status')
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
      setSignups(prev => [...prev, { task_id: taskId, status: 'pending' }]);
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

  const handleLikeToggle = (taskId: string, liked: boolean) => {
    if (liked) {
      setMyLikes(prev => new Set(prev).add(taskId));
      setLikeCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
    } else {
      setMyLikes(prev => { const s = new Set(prev); s.delete(taskId); return s; });
      setLikeCounts(prev => ({ ...prev, [taskId]: Math.max((prev[taskId] || 1) - 1, 0) }));
    }
  };

  const isSignedUp = (taskId: string) => signups.some(s => s.task_id === taskId);
  const getSignupStatus = (taskId: string) => signups.find(s => s.task_id === taskId)?.status || null;

  const pendingSignups = signups.filter(s => s.status === 'pending');
  const assignedSignups = signups.filter(s => s.status === 'assigned');

  const handleSignContract = async (taskId: string) => {
    setSigningContract(taskId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Fetch templates
      const templatesUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=templates`;
      const templatesResp = await fetch(templatesUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const templatesData = await templatesResp.json();
      const templates = Array.isArray(templatesData) ? templatesData : templatesData?.data || [];
      
      if (templates.length === 0) {
        toast.error('Geen templates beschikbaar in DocuSeal');
        setSigningContract(null);
        return;
      }

      // Use the first template for the dummy test
      const templateId = templates[0].id;
      const submitUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-submission`;
      const resp = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          task_id: taskId,
          volunteer_email: profile?.email,
          volunteer_name: profile?.full_name,
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        toast.success('Contract verstuurd! Check je e-mail om te ondertekenen.');
      } else {
        toast.error(data.error || 'Er ging iets mis');
      }
    } catch (err) {
      toast.error('Er ging iets mis bij het versturen');
    }
    setSigningContract(null);
  };


  const filteredTasks = tasks.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || task.title.toLowerCase().includes(q) || 
      task.description?.toLowerCase().includes(q) ||
      task.clubs?.name.toLowerCase().includes(q) ||
      task.clubs?.sport?.toLowerCase().includes(q) ||
      task.location?.toLowerCase().includes(q);
    
    if (activeTab === 'mine') {
      const status = getSignupStatus(task.id);
      if (!status) return false;
      return matchesSearch && status === mineSubTab;
    }
    return matchesSearch;
  });

  const dashboardT = {
    nl: { welcome: 'Welkom', availableTasks: 'Beschikbare taken', searchPlaceholder: 'Zoek taken, clubs of locaties...', noTasks: 'Er zijn momenteel geen openstaande taken.', signUp: 'Inschrijven', signedUp: 'Ingeschreven', assigned: 'Toegekend', cancel: 'Annuleren', spots: 'plaatsen', logout: 'Uitloggen', mySignups: 'Mijn inschrijvingen', allTasks: 'Alle taken', myTasks: 'Mijn taken', noMyTasks: 'Geen taken in deze categorie.', signContract: 'Contract ondertekenen', signing: 'Laden...', ingeschreven: 'Ingeschreven', toegekend: 'Toegekend' },
    fr: { welcome: 'Bienvenue', availableTasks: 'Tâches disponibles', searchPlaceholder: 'Rechercher des tâches, clubs ou lieux...', noTasks: 'Il n\'y a actuellement aucune tâche disponible.', signUp: 'S\'inscrire', signedUp: 'Inscrit', assigned: 'Attribué', cancel: 'Annuler', spots: 'places', logout: 'Déconnexion', mySignups: 'Mes inscriptions', allTasks: 'Toutes les tâches', myTasks: 'Mes tâches', noMyTasks: 'Aucune tâche dans cette catégorie.', signContract: 'Signer le contrat', signing: 'Chargement...', ingeschreven: 'Inscrits', toegekend: 'Attribués' },
    en: { welcome: 'Welcome', availableTasks: 'Available tasks', searchPlaceholder: 'Search tasks, clubs or locations...', noTasks: 'There are currently no open tasks.', signUp: 'Sign up', signedUp: 'Signed up', assigned: 'Assigned', cancel: 'Cancel', spots: 'spots', logout: 'Log out', mySignups: 'My signups', allTasks: 'All tasks', myTasks: 'My tasks', noMyTasks: 'No tasks in this category.', signContract: 'Sign contract', signing: 'Loading...', ingeschreven: 'Signed up', toegekend: 'Assigned' },
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
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={dt.allTasks}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowProfileDialog(true)}
              className="relative group"
              title="Mijn profiel"
            >
              <Avatar className="w-8 h-8">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
                )}
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
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
          <p className="text-muted-foreground mt-1">{dt.availableTasks}: {tasks.length}</p>
        </motion.div>

        {/* Filter bar */}
        <div className="mt-6 bg-card rounded-2xl shadow-card border border-transparent p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={dt.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border-0"
            />
          </div>

          {/* Tab chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {dt.allTasks}
            </button>
            <button
              onClick={() => { setActiveTab('mine'); setMineSubTab('pending'); }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === 'mine' && mineSubTab === 'pending'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {dt.ingeschreven}
              {pendingSignups.length > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                  activeTab === 'mine' && mineSubTab === 'pending'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {pendingSignups.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('mine'); setMineSubTab('assigned'); }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === 'mine' && mineSubTab === 'assigned'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {dt.toegekend}
              {assignedSignups.length > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                  activeTab === 'mine' && mineSubTab === 'assigned'
                    ? 'bg-accent-foreground/20 text-accent-foreground'
                    : 'bg-accent/10 text-accent'
                }`}>
                  {assignedSignups.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tasks list */}
        <div className="mt-6 space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{activeTab === 'mine' ? dt.noMyTasks : dt.noTasks}</p>
            </div>
          ) : (
            filteredTasks.map((task, i) => {
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
                  className={`bg-card rounded-2xl p-5 shadow-card border transition-all cursor-pointer ${
                    isAssigned ? 'border-accent/30 bg-accent/5' : signed ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:shadow-elevated'
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
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <LikeButton
                          taskId={task.id}
                          liked={myLikes.has(task.id)}
                          count={likeCounts[task.id] || 0}
                          onToggle={handleLikeToggle}
                        />
                        {isAssigned ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-accent/30 text-accent bg-accent/5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {dt.assigned}
                          </span>
                        ) : signed ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/30 text-primary bg-primary/5">
                            ✓ {dt.signedUp}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">
                            {dt.signUp} →
                          </span>
                        )}
                      </div>
                      {isAssigned && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSignContract(task.id); }}
                          disabled={signingContract === task.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          {signingContract === task.id ? dt.signing : dt.signContract}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

      </main>

      {currentUserId && (
        <EditProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          userId={currentUserId}
          language={language}
          onProfileUpdated={(updated) => {
            setProfile(prev => prev ? {
              ...prev,
              full_name: updated.full_name || prev.full_name,
              avatar_url: updated.avatar_url,
            } : prev);
          }}
        />
      )}
    </div>
  );
};

export default VolunteerDashboard;
