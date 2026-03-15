import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Search, CheckCircle, CalendarDays, Award, FileSignature, Globe, Sparkles, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LikeButton from '@/components/LikeButton';
import { Button } from '@/components/ui/button';
import type { VolunteerTask, TaskSignup, VolunteerEventData, SignatureContract } from '@/types/volunteer';
import { volunteerDashboardLabels } from '@/types/volunteer';
import { Language } from '@/i18n/translations';

interface Props {
  language: Language;
  currentUserId: string;
  activeTab: 'all' | 'mine';
  mineSubTab: 'pending' | 'assigned' | 'history';
  setMineSubTab: (v: 'pending' | 'assigned' | 'history') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tasks: VolunteerTask[];
  signups: TaskSignup[];
  events: VolunteerEventData[];
  followedClubIds: Set<string> | null;
  signupCounts: Record<string, number>;
  likeCounts: Record<string, number>;
  myLikes: Set<string>;
  myCertifiedTrainingIds: Set<string>;
  myContracts: SignatureContract[];
  isSignedUp: (taskId: string) => boolean;
  getSignupStatus: (taskId: string) => string | null;
  onLikeToggle: (taskId: string, liked: boolean) => void;
  onSignContract: (taskId: string) => void;
  onSelectEvent: (event: VolunteerEventData) => void;
  onSignupComplete?: () => void;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const VolunteerTasksList = ({
  language, currentUserId, activeTab, mineSubTab, setMineSubTab, searchQuery, setSearchQuery,
  tasks, signups, events, followedClubIds, signupCounts, likeCounts, myLikes,
  myCertifiedTrainingIds, myContracts, isSignedUp, getSignupStatus,
  onLikeToggle, onSignContract, onSelectEvent, onSignupComplete,
}: Props) => {
  const navigate = useNavigate();
  const dt = volunteerDashboardLabels[language as keyof typeof volunteerDashboardLabels] || volunteerDashboardLabels.nl;
  const hasFollows = followedClubIds !== null && followedClubIds.size > 0;
  const [showAllClubs, setShowAllClubs] = useState(false);
  const [recommendedTasks, setRecommendedTasks] = useState<VolunteerTask[]>([]);
  const [quickSigningUp, setQuickSigningUp] = useState<string | null>(null);

  // Count active upcoming signups (next 30 days)
  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 86400000);
  const activeUpcomingSignups = signups.filter(s => {
    if (s.status !== 'pending' && s.status !== 'assigned') return false;
    const task = tasks.find(t => t.id === s.task_id);
    if (!task?.task_date) return false;
    const d = new Date(task.task_date);
    return d >= now && d <= in30d;
  }).length;

  // Load recommended tasks
  useEffect(() => {
    if (!currentUserId || activeTab !== 'all' || activeUpcomingSignups > 3) {
      setRecommendedTasks([]);
      return;
    }
    const loadRecommended = async () => {
      // Fetch user preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', currentUserId)
        .maybeSingle();

      const prefs = (profile?.preferences as { categories?: string[]; time_prefs?: string[] } | null) || {};
      const prefCategories = new Set(prefs.categories || []);

      // Filter tasks: next 30 days, not signed up, has spots
      const candidates = tasks.filter(t => {
        if (isSignedUp(t.id)) return false;
        if (!t.task_date) return false;
        const d = new Date(t.task_date);
        if (d < now || d > in30d) return false;
        const currentSignups = signupCounts[t.id] || 0;
        if (currentSignups >= t.spots_available) return false;
        return true;
      });

      // Score tasks based on preference match
      const scored = candidates.map(t => {
        let score = 0;
        const sport = (t.clubs?.sport || '').toLowerCase();
        const title = t.title.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const combined = `${sport} ${title} ${desc}`;

        // Match against preference categories
        if (prefCategories.size > 0) {
          const categoryKeywords: Record<string, string[]> = {
            steward: ['steward', 'veiligheid', 'security', 'sécurité', 'safety'],
            bar: ['bar', 'catering', 'drank', 'eten', 'food', 'drink', 'restauration'],
            terrain: ['terrein', 'materiaal', 'opbouw', 'afbouw', 'grounds', 'setup', 'terrain'],
            admin: ['admin', 'ticketing', 'registratie', 'onthaal', 'accueil', 'reception'],
            event: ['event', 'evenement', 'événement', 'support', 'festival'],
            cleaning: ['opruim', 'schoonmaak', 'cleaning', 'nettoyage', 'afbraak'],
          };

          for (const cat of prefCategories) {
            const keywords = categoryKeywords[cat] || [];
            if (keywords.some(kw => combined.includes(kw))) {
              score += 10;
            }
          }
        }

        // Followed club bonus
        if (followedClubIds?.has(t.club_id)) score += 5;

        // Sooner tasks get slight priority
        const daysAway = (new Date(t.task_date!).getTime() - now.getTime()) / 86400000;
        score += Math.max(0, 3 - daysAway / 10);

        return { task: t, score };
      });

      scored.sort((a, b) => b.score - a.score);
      setRecommendedTasks(scored.slice(0, 3).filter(s => s.score > 0).map(s => s.task));
    };
    loadRecommended();
  }, [currentUserId, activeTab, tasks.length, signups.length]);

  const handleQuickSignup = async (taskId: string) => {
    if (!currentUserId) return;
    setQuickSigningUp(taskId);
    const { error } = await supabase.from('task_signups').insert({ task_id: taskId, volunteer_id: currentUserId });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t3(language, 'Ingeschreven!', 'Inscrit !', 'Signed up!'));
      setRecommendedTasks(prev => prev.filter(t => t.id !== taskId));
      onSignupComplete?.();
    }
    setQuickSigningUp(null);
  };

  const feedTasks = hasFollows && activeTab === 'all' && !showAllClubs ? tasks.filter(t => followedClubIds!.has(t.club_id)) : tasks;
  const looseTasks = feedTasks.filter(t => !t.event_id);

  const filteredLooseTasks = looseTasks.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q) || task.clubs?.name.toLowerCase().includes(q) || task.clubs?.sport?.toLowerCase().includes(q) || task.location?.toLowerCase().includes(q);
    if (activeTab === 'mine') {
      const status = getSignupStatus(task.id);
      if (!status) return false;
      const isPast = task.task_date ? new Date(task.task_date) < new Date() : false;
      if (mineSubTab === 'history') return matchesSearch && isPast;
      if (isPast) return false;
      return matchesSearch && status === mineSubTab;
    }
    return matchesSearch;
  });

  const filteredEvents = events.filter(event => {
    if (hasFollows && activeTab === 'all' && !showAllClubs && !followedClubIds!.has(event.club_id)) return false;
    if (activeTab === 'mine') {
      const isPastEvent = event.event_date ? new Date(event.event_date) < new Date() : false;
      if (mineSubTab === 'history') return isPastEvent;
      if (isPastEvent) return false;
      const evTasks = tasks.filter(t => t.event_id === event.id);
      return evTasks.some(t => getSignupStatus(t.id) === mineSubTab);
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return event.title.toLowerCase().includes(q) || event.location?.toLowerCase().includes(q) || event.club_name?.toLowerCase().includes(q);
  });

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-heading font-bold text-foreground">{activeTab === 'all' ? dt.allTasks : dt.myTasks}</h1>
        <div className="flex gap-2 flex-wrap items-center">
          {activeTab === 'all' && hasFollows && (
            <button
              onClick={() => setShowAllClubs(p => !p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${showAllClubs ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <Globe className="w-3.5 h-3.5" />
              {t3(language, 'Alle clubs', 'Tous les clubs', 'All clubs')}
            </button>
          )}
          {activeTab === 'mine' && (
            <>
              <button onClick={() => setMineSubTab('pending')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mineSubTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{dt.ingeschreven}</button>
              <button onClick={() => setMineSubTab('assigned')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mineSubTab === 'assigned' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{dt.toegekend}</button>
              <button onClick={() => setMineSubTab('history')} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mineSubTab === 'history' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t3(language, 'Historie', 'Historique', 'History')}</button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder={dt.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-border" />
      </div>

      {/* Recommended for you */}
      {activeTab === 'all' && recommendedTasks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t3(language, 'Aanbevolen voor jou', 'Recommandé pour vous', 'Recommended for you')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {recommendedTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl p-4 shadow-sm border border-primary/20 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {task.clubs?.sport || task.clubs?.name}
                  </span>
                  {task.clubs?.name && (
                    <span className="text-[10px] text-muted-foreground truncate">{task.clubs.name}</span>
                  )}
                </div>
                <h3
                  className="font-heading font-semibold text-foreground text-sm line-clamp-1 cursor-pointer hover:underline"
                  onClick={() => navigate(`/task/${task.id}`)}
                >
                  {task.title}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
                  {task.task_date && (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.task_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {(task.location || task.clubs?.location) && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {task.location || task.clubs?.location}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    {signupCounts[task.id] || 0}/{task.spots_available}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3 h-8 text-xs gap-1.5"
                  disabled={quickSigningUp === task.id}
                  onClick={(e) => { e.stopPropagation(); handleQuickSignup(task.id); }}
                >
                  {quickSigningUp === task.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {t3(language, 'Snel inschrijven', 'Inscription rapide', 'Quick sign up')}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Events */}
      {filteredEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" />{dt.events}</h2>
          <div className="space-y-3">
            {filteredEvents.map((event, i) => {
              const evTasks = tasks.filter(t => t.event_id === event.id);
              const totalSpots = evTasks.reduce((s, t) => s + t.spots_available, 0);
              const totalSignups = evTasks.reduce((s, t) => s + (signupCounts[t.id] || 0), 0);
              const myEventSignups = evTasks.filter(t => isSignedUp(t.id)).length;
              return (
                <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => onSelectEvent(event)}
                  className={`bg-card rounded-2xl p-5 shadow-sm border transition-all cursor-pointer hover:shadow-md ${myEventSignups > 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><CalendarDays className="w-4 h-4 text-primary" />{event.club_name && <span className="text-xs text-muted-foreground">{event.club_name}</span>}</div>
                      <h3 className="font-heading font-semibold text-foreground text-lg">{event.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{totalSignups}/{totalSpots}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">{dt.viewEvent} →</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loose tasks */}
      <div>
        {filteredEvents.length > 0 && <h2 className="text-lg font-heading font-semibold text-foreground mb-3">{dt.looseTasks}</h2>}
        <div className="space-y-3">
          {filteredLooseTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{activeTab === 'mine' ? dt.noMyTasks : dt.noTasks}</p></div>
          ) : (
            filteredLooseTasks.map((task, i) => {
              const signed = isSignedUp(task.id);
              const signupStatus = getSignupStatus(task.id);
              const isAssigned = signupStatus === 'assigned';
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/task/${task.id}`)}
                  className={`bg-card rounded-2xl p-5 shadow-sm border transition-all cursor-pointer hover:shadow-md ${isAssigned ? 'border-accent/30' : signed ? 'border-primary/30' : 'border-border'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{task.clubs?.sport || task.clubs?.name}</span>
                        {task.clubs?.name && <span className="text-xs text-muted-foreground">{task.clubs.name}</span>}
                      </div>
                      <h3 className="font-heading font-semibold text-foreground">{task.title}</h3>
                      {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        {task.task_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(task.task_date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        {(task.location || task.clubs?.location) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location || task.clubs?.location}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{signupCounts[task.id] || 0}/{task.spots_available} {dt.spots}</span>
                        {task.required_training_id && (
                          myCertifiedTrainingIds.has(task.required_training_id) ? (
                            <span className="flex items-center gap-1 text-accent font-medium"><Award className="w-3.5 h-3.5" />{t3(language, 'Gecertificeerd', 'Certifié', 'Certified')}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600 font-medium"><Award className="w-3.5 h-3.5" />{t3(language, 'Training vereist', 'Formation requise', 'Training required')}</span>
                          )
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <LikeButton taskId={task.id} liked={myLikes.has(task.id)} count={likeCounts[task.id] || 0} onToggle={onLikeToggle} />
                        {isAssigned ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-accent/30 text-accent bg-accent/5 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{dt.assigned}</span>
                        ) : signed ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/30 text-primary bg-primary/5">✓ {dt.signedUp}</span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground">{dt.signUp} →</span>
                        )}
                      </div>
                      {isAssigned && (
                        <button onClick={(e) => { e.stopPropagation(); onSignContract(task.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                          <FileSignature className="w-3.5 h-3.5" />{dt.signContract}
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
    </div>
  );
};

export default VolunteerTasksList;
