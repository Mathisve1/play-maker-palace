import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Clock, Tag, Check, Save, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';

interface TaskPreferencesProps {
  userId: string;
  language: Language;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    task_date: string | null;
    location: string | null;
    clubs?: { name: string; sport: string | null; location: string | null } | null;
  }[];
  signedUpTaskIds: Set<string>;
  onNavigateToTask: (taskId: string) => void;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const CATEGORIES = [
  { key: 'steward', nl: 'Steward / Veiligheid', fr: 'Steward / Sécurité', en: 'Steward / Safety', icon: '🛡️' },
  { key: 'bar', nl: 'Bar / Catering', fr: 'Bar / Restauration', en: 'Bar / Catering', icon: '🍺' },
  { key: 'terrain', nl: 'Terrein / Materiaal', fr: 'Terrain / Matériel', en: 'Grounds / Materials', icon: '⚽' },
  { key: 'admin', nl: 'Admin / Ticketing', fr: 'Admin / Billetterie', en: 'Admin / Ticketing', icon: '🎫' },
  { key: 'event', nl: 'Event Support', fr: 'Support événement', en: 'Event Support', icon: '🎪' },
  { key: 'cleaning', nl: 'Opruimen / Schoonmaak', fr: 'Nettoyage', en: 'Cleaning', icon: '🧹' },
];

const TIME_PREFS = [
  { key: 'morning', nl: 'Ochtend', fr: 'Matin', en: 'Morning', icon: '🌅' },
  { key: 'afternoon', nl: 'Middag', fr: 'Après-midi', en: 'Afternoon', icon: '☀️' },
  { key: 'evening', nl: 'Avond', fr: 'Soirée', en: 'Evening', icon: '🌙' },
  { key: 'weekend', nl: 'Weekend', fr: 'Week-end', en: 'Weekend', icon: '📅' },
];

const VolunteerTaskPreferences = ({ userId, language, tasks, signedUpTaskIds, onNavigateToTask }: TaskPreferencesProps) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTimePref, setSelectedTimePref] = useState<Set<string>>(new Set());
  const [maxDistance, setMaxDistance] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  // Load preferences from profile metadata
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle();
      if (data?.preferences) {
        const prefs = data.preferences as { categories?: string[]; time_prefs?: string[]; max_distance?: string };
        if (prefs.categories) setSelectedCategories(new Set(prefs.categories));
        if (prefs.time_prefs) setSelectedTimePref(new Set(prefs.time_prefs));
        if (prefs.max_distance) setMaxDistance(prefs.max_distance);
      }
      setLoaded(true);
    };
    load();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const prefs = {
      categories: Array.from(selectedCategories),
      time_prefs: Array.from(selectedTimePref),
      max_distance: maxDistance,
    };
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', userId);
    if (error) toast.error(error.message);
    else {
      toast.success(t3(language, 'Voorkeuren opgeslagen!', 'Préférences enregistrées!', 'Preferences saved!'));
      setShowPrefs(false);
    }
    setSaving(false);
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  const toggleTime = (key: string) => {
    setSelectedTimePref(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  // Score tasks based on preferences
  const getRecommendations = () => {
    if (selectedCategories.size === 0 && selectedTimePref.size === 0) return [];

    const scored = tasks
      .filter(t => !signedUpTaskIds.has(t.id))
      .filter(t => t.task_date && new Date(t.task_date) > new Date())
      .map(t => {
        let score = 0;
        const titleLower = (t.title + ' ' + (t.description || '')).toLowerCase();

        // Category matching
        selectedCategories.forEach(cat => {
          const keywords: Record<string, string[]> = {
            steward: ['steward', 'veiligheid', 'security', 'safety', 'bewaking'],
            bar: ['bar', 'catering', 'drank', 'eten', 'food', 'drink', 'horeca'],
            terrain: ['terrein', 'materiaal', 'opbouw', 'afbouw', 'grounds', 'setup'],
            admin: ['admin', 'ticket', 'registratie', 'onthaal', 'reception'],
            event: ['event', 'support', 'logistiek', 'coördinator', 'coordinator'],
            cleaning: ['opruim', 'schoonmaak', 'cleaning', 'afbraak', 'nettoyage'],
          };
          if (keywords[cat]?.some(kw => titleLower.includes(kw))) score += 3;
        });

        // Time matching
        if (t.task_date && selectedTimePref.size > 0) {
          const d = new Date(t.task_date);
          const hour = d.getHours();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          if (selectedTimePref.has('morning') && hour >= 6 && hour < 12) score += 2;
          if (selectedTimePref.has('afternoon') && hour >= 12 && hour < 18) score += 2;
          if (selectedTimePref.has('evening') && hour >= 18) score += 2;
          if (selectedTimePref.has('weekend') && isWeekend) score += 2;
        }

        return { task: t, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored;
  };

  if (!loaded) return null;

  const recommendations = getRecommendations();
  const hasPrefs = selectedCategories.size > 0 || selectedTimePref.size > 0;
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t3(language, 'Aanbevolen voor jou', 'Recommandé pour vous', 'Recommended for you')}
        </h2>
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          <Tag className="w-3.5 h-3.5" />
          {t3(language, 'Voorkeuren', 'Préférences', 'Preferences')}
        </button>
      </div>

      {/* Preferences editor */}
      {showPrefs && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-2xl border border-border p-4 space-y-4"
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t3(language, 'Welk type taken heb je het liefst?', 'Quels types de tâches préférez-vous?', 'What type of tasks do you prefer?')}
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedCategories.has(cat.key) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat[language]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t3(language, 'Wanneer ben je het liefst beschikbaar?', 'Quand êtes-vous disponible?', 'When are you available?')}
            </p>
            <div className="flex flex-wrap gap-2">
              {TIME_PREFS.map(tp => (
                <button
                  key={tp.key}
                  onClick={() => toggleTime(tp.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedTimePref.has(tp.key) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>{tp.icon}</span>
                  {tp[language]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPrefs(false)} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground">
              {t3(language, 'Annuleren', 'Annuler', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t3(language, 'Opslaan', 'Enregistrer', 'Save')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {!hasPrefs ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {t3(language,
              'Stel je voorkeuren in om gepersonaliseerde taakaanbevelingen te krijgen.',
              'Configurez vos préférences pour des recommandations personnalisées.',
              'Set your preferences to get personalized task recommendations.'
            )}
          </p>
          <button onClick={() => setShowPrefs(true)} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90">
            {t3(language, 'Voorkeuren instellen', 'Configurer', 'Set preferences')} →
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-5 text-center">
          <p className="text-sm text-muted-foreground">
            {t3(language,
              'Geen nieuwe aanbevelingen op dit moment. Check later terug!',
              'Aucune recommandation pour le moment.',
              'No recommendations right now. Check back later!'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map(({ task, score }, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onNavigateToTask(task.id)}
              className="bg-card rounded-2xl p-4 border border-border hover:border-primary/30 cursor-pointer transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                <div className="flex flex-wrap gap-2 mt-0.5 text-[11px] text-muted-foreground">
                  {task.clubs?.name && <span>{task.clubs.name}</span>}
                  {task.task_date && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(task.task_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {task.location && (
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {score >= 4 ? '🔥' : '⭐'} {Math.round((score / 5) * 100)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default VolunteerTaskPreferences;
