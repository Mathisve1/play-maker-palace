import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Trophy, Star, Award, Medal, Crown, Clock, Hourglass, Users, Globe, Moon, Zap, Share2 } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface BadgeDef {
  id: string;
  key: string;
  name_nl: string;
  name_fr: string;
  name_en: string;
  description_nl: string | null;
  description_fr: string | null;
  description_en: string | null;
  icon: string;
  condition_type: string;
  threshold: number;
}

interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

const iconMap: Record<string, any> = {
  star: Star, trophy: Trophy, medal: Medal, crown: Crown,
  clock: Clock, hourglass: Hourglass, users: Users, globe: Globe,
  moon: Moon, zap: Zap, award: Award,
};

interface Props {
  userId: string;
  language: Language;
  totalPoints: number;
  refreshKey?: number;
}

const VolunteerLoyaltyProgress = ({ userId, language, totalPoints, refreshKey }: Props) => {
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [earned, setEarned] = useState<Map<string, string>>(new Map());
  const [stats, setStats] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [{ data: defs }, { data: userBadges }] = await Promise.all([
      supabase.from('badge_definitions').select('*').order('threshold'),
      supabase.from('volunteer_badges').select('badge_id, earned_at').eq('user_id', userId),
    ]);
    if (defs) setAllBadges(defs);
    if (userBadges) {
      const newEarned = new Map(userBadges.map((b: EarnedBadge) => [b.badge_id, b.earned_at]));

      // Confetti for newly seen badges
      const seenKey = `loyalty-badges-seen-${userId}`;
      const seenRaw = localStorage.getItem(seenKey);
      const seen = seenRaw ? new Set(JSON.parse(seenRaw)) : new Set();
      let hasNew = false;
      newEarned.forEach((_, id) => {
        if (!seen.has(id)) { hasNew = true; seen.add(id); }
      });
      if (hasNew) {
        localStorage.setItem(seenKey, JSON.stringify([...seen]));
        setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }), 300);
      }
      setEarned(newEarned);
    }

    const [{ count: taskCount }, { data: hourData }] = await Promise.all([
      supabase.from('task_signups').select('id', { count: 'exact', head: true }).eq('volunteer_id', userId).eq('status', 'assigned'),
      supabase.from('hour_confirmations').select('final_hours').eq('volunteer_id', userId).eq('status', 'confirmed'),
    ]);
    const totalHours = (hourData || []).reduce((s, h) => s + (h.final_hours || 0), 0);
    setStats({ tasks_completed: taskCount || 0, hours_worked: totalHours });
  }, [userId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const earnedBadges = allBadges.filter(b => earned.has(b.id));
  const lockedBadges = allBadges.filter(b => !earned.has(b.id));

  const nextBadge = lockedBadges.length > 0 ? lockedBadges[0] : null;
  const nextProgress = nextBadge
    ? Math.min(100, ((stats[nextBadge.condition_type] || 0) / nextBadge.threshold) * 100)
    : 100;
  const nextRemaining = nextBadge ? Math.max(0, nextBadge.threshold - (stats[nextBadge.condition_type] || 0)) : 0;

  const getBadgeName = (b: BadgeDef) => language === 'nl' ? b.name_nl : language === 'fr' ? b.name_fr : b.name_en;
  const getBadgeDesc = (b: BadgeDef) => language === 'nl' ? b.description_nl : language === 'fr' ? b.description_fr : b.description_en;

  const handleShare = (badge: BadgeDef) => {
    const name = getBadgeName(badge);
    const text = t3(language,
      `Ik heb de "${name}" badge verdiend als vrijwilliger! 🏆`,
      `J'ai gagné le badge "${name}" en tant que bénévole ! 🏆`,
      `I earned the "${name}" badge as a volunteer! 🏆`
    );
    if (navigator.share) {
      navigator.share({ title: name, text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text);
      toast.success(t3(language, 'Gekopieerd!', 'Copié !', 'Copied!'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
          <Star className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{totalPoints}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Punten', 'Points', 'Points')}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
          <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{earnedBadges.length}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Badges', 'Badges', 'Badges')}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
          <Award className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{allBadges.length > 0 ? `${earnedBadges.length}/${allBadges.length}` : '—'}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Voltooid', 'Complétés', 'Completed')}</p>
        </motion.div>
      </div>

      {/* Next badge progress */}
      {nextBadge && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            {(() => { const Icon = iconMap[nextBadge.icon] || Award; return <Icon className="w-5 h-5 text-primary" />; })()}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {t3(language, 'Volgende badge', 'Prochain badge', 'Next badge')}: {getBadgeName(nextBadge)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t3(language, `Nog ${nextRemaining} nodig`, `Encore ${nextRemaining} nécessaire(s)`, `${nextRemaining} more needed`)}
              </p>
            </div>
          </div>
          <Progress value={nextProgress} className="h-2" />
        </motion.div>
      )}

      {/* All badges grid */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {t3(language, 'Alle badges', 'Tous les badges', 'All badges')}
        </h2>

        {earnedBadges.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {earnedBadges.map(badge => {
              const Icon = iconMap[badge.icon] || Award;
              const name = getBadgeName(badge);
              const earnedAt = earned.get(badge.id);
              return (
                <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="relative group bg-card rounded-2xl p-3 border border-primary/20 text-center shadow-sm">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-1.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[11px] font-semibold text-foreground truncate">{name}</p>
                  {earnedAt && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(earnedAt).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  <button onClick={() => handleShare(badge)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted">
                    <Share2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {lockedBadges.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {lockedBadges.map(badge => {
              const Icon = iconMap[badge.icon] || Award;
              const name = getBadgeName(badge);
              const remaining = Math.max(0, badge.threshold - (stats[badge.condition_type] || 0));
              return (
                <div key={badge.id} className="bg-card rounded-2xl p-3 border border-border text-center opacity-40 grayscale"
                  title={getBadgeDesc(badge) || ''}>
                  <div className="w-10 h-10 mx-auto rounded-xl bg-muted flex items-center justify-center mb-1.5">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">{name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {t3(language, `${remaining} nog`, `${remaining} restant(s)`, `${remaining} more`)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerLoyaltyProgress;
