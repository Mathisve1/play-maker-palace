import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Award, Clock, Users, MapPin, Star, Share2, Download, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface Skill {
  id: string;
  skill_name: string;
  level: string;
  source: string | null;
  verified: boolean;
}

interface Props {
  userId: string;
  language: Language;
  isOwnProfile?: boolean;
}

const levelColors: Record<string, string> = {
  beginner: 'bg-muted text-muted-foreground',
  intermediate: 'bg-primary/10 text-primary',
  advanced: 'bg-accent/10 text-accent-foreground',
  expert: 'bg-yellow-500/10 text-yellow-700',
};

const SkillsPassport = ({ userId, language, isOwnProfile = true }: Props) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState({ totalHours: 0, totalTasks: 0, clubs: 0, badges: 0 });
  const [newSkill, setNewSkill] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: skillsData }, { count: taskCount }, { data: hourData }, { count: badgeCount }] = await Promise.all([
        supabase.from('volunteer_skills').select('*').eq('user_id', userId),
        supabase.from('task_signups').select('id', { count: 'exact', head: true }).eq('volunteer_id', userId).eq('status', 'assigned'),
        supabase.from('hour_confirmations').select('final_hours').eq('volunteer_id', userId).eq('status', 'confirmed'),
        supabase.from('volunteer_badges').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      if (skillsData) setSkills(skillsData);

      const totalHours = (hourData || []).reduce((s: number, h: any) => s + (h.final_hours || 0), 0);

      // Unique clubs
      const { data: clubData } = await supabase.from('task_signups').select('tasks!inner(club_id)').eq('volunteer_id', userId).eq('status', 'assigned');
      const clubSet = new Set((clubData || []).map((d: any) => d.tasks?.club_id).filter(Boolean));

      setStats({
        totalHours: Math.round(totalHours),
        totalTasks: taskCount || 0,
        clubs: clubSet.size,
        badges: badgeCount || 0,
      });
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    setAdding(true);
    const { data, error } = await supabase.from('volunteer_skills').insert({
      user_id: userId,
      skill_name: newSkill.trim(),
      level: 'beginner',
      source: 'self-reported',
    }).select('*').single();

    if (error) toast.error(error.message);
    else { setSkills(prev => [...prev, data]); setNewSkill(''); }
    setAdding(false);
  };

  const handleRemoveSkill = async (id: string) => {
    await (supabase as any).from('volunteer_skills').delete().eq('id', id);
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleShare = () => {
    const text = t3(language,
      `Mijn vrijwilligers-CV: ${stats.totalTasks} taken, ${stats.totalHours} uur, ${stats.badges} badges bij ${stats.clubs} clubs.`,
      `Mon CV bénévole : ${stats.totalTasks} tâches, ${stats.totalHours}h, ${stats.badges} badges dans ${stats.clubs} clubs.`,
      `My volunteer CV: ${stats.totalTasks} tasks, ${stats.totalHours}h, ${stats.badges} badges at ${stats.clubs} clubs.`
    );
    if (navigator.share) {
      navigator.share({ title: 'Volunteer CV', text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text);
      toast.success(t3(language, 'Gekopieerd!', 'Copié !', 'Copied!'));
    }
  };

  if (loading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          {t3(language, 'Skills-paspoort', 'Passeport de compétences', 'Skills Passport')}
        </h2>
        {isOwnProfile && (
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="w-3.5 h-3.5" />
            {t3(language, 'Delen', 'Partager', 'Share')}
          </Button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.totalHours}h</p>
          <p className="text-[10px] text-muted-foreground">{t3(language, 'Uren', 'Heures', 'Hours')}</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <Star className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.totalTasks}</p>
          <p className="text-[10px] text-muted-foreground">{t3(language, 'Taken', 'Tâches', 'Tasks')}</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <Users className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.clubs}</p>
          <p className="text-[10px] text-muted-foreground">{t3(language, 'Clubs', 'Clubs', 'Clubs')}</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <Award className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.badges}</p>
          <p className="text-[10px] text-muted-foreground">Badges</p>
        </div>
      </div>

      {/* Skills list */}
      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t3(language, 'Vaardigheden', 'Compétences', 'Skills')}
        </p>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <div key={skill.id} className="group flex items-center gap-1">
                <Badge variant="secondary" className={levelColors[skill.level] || levelColors.beginner}>
                  {skill.skill_name}
                  {skill.verified && <Star className="w-2.5 h-2.5 ml-0.5 fill-current" />}
                </Badge>
                {isOwnProfile && (
                  <button onClick={() => handleRemoveSkill(skill.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t3(language, 'Nog geen vaardigheden toegevoegd.', 'Aucune compétence ajoutée.', 'No skills added yet.')}
          </p>
        )}

        {isOwnProfile && (
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              placeholder={t3(language, 'Voeg vaardigheid toe...', 'Ajouter une compétence...', 'Add skill...')}
              className="text-sm h-9"
              onKeyDown={e => { if (e.key === 'Enter') handleAddSkill(); }}
            />
            <Button size="sm" onClick={handleAddSkill} disabled={adding || !newSkill.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SkillsPassport;
