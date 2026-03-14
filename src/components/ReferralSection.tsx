import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Share2, Copy, Users, Gift, Check, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface ClubReferralInfo {
  club_id: string;
  club_name: string;
  bonus_points: number;
  pending_count: number;
  completed_count: number;
  total_points_earned: number;
}

interface Props {
  userId: string;
  language: Language;
}

const ReferralSection = ({ userId, language }: Props) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [clubReferrals, setClubReferrals] = useState<ClubReferralInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Get or create referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        const code = userId.slice(0, 8).toUpperCase();
        await supabase.from('profiles').update({ referral_code: code } as any).eq('id', userId);
        setReferralCode(code);
      }

      // Get clubs the user follows
      const { data: follows } = await supabase
        .from('club_follows')
        .select('club_id')
        .eq('user_id', userId);

      if (follows && follows.length > 0) {
        const clubIds = follows.map(f => f.club_id);
        
        // Get club info with referral settings
        const { data: clubs } = await supabase
          .from('clubs')
          .select('id, name, referral_bonus_points')
          .in('id', clubIds);

        // Get referral stats per club
        const { data: referrals } = await supabase
          .from('club_referrals')
          .select('club_id, status, bonus_points_awarded')
          .eq('referrer_id', userId);

        const clubInfos: ClubReferralInfo[] = (clubs || [])
          .filter((c: any) => (c.referral_bonus_points || 0) > 0)
          .map((c: any) => {
            const clubRefs = (referrals || []).filter((r: any) => r.club_id === c.id);
            return {
              club_id: c.id,
              club_name: c.name,
              bonus_points: c.referral_bonus_points || 0,
              pending_count: clubRefs.filter((r: any) => r.status === 'pending').length,
              completed_count: clubRefs.filter((r: any) => r.status === 'completed').length,
              total_points_earned: clubRefs.reduce((sum: number, r: any) => sum + (r.bonus_points_awarded || 0), 0),
            };
          });

        setClubReferrals(clubInfos);
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  const handleCopy = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success(t3(language, 'Code gekopieerd!', 'Code copié !', 'Code copied!'));
    }
  };

  const handleShare = (clubName?: string) => {
    const text = clubName
      ? t3(language,
          `Word vrijwilliger bij ${clubName} via De 12e Man! Gebruik mijn code: ${referralCode}`,
          `Devenez bénévole chez ${clubName} via De 12e Man ! Utilisez mon code : ${referralCode}`,
          `Become a volunteer at ${clubName} via De 12e Man! Use my code: ${referralCode}`
        )
      : t3(language,
          `Word vrijwilliger via De 12e Man! Gebruik mijn code: ${referralCode}`,
          `Devenez bénévole via De 12e Man ! Utilisez mon code : ${referralCode}`,
          `Become a volunteer via De 12e Man! Use my code: ${referralCode}`
        );
    
    const shareUrl = `${window.location.origin}/community`;
    
    if (navigator.share) {
      navigator.share({ title: 'De 12e Man', text, url: shareUrl });
    } else {
      navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      toast.success(t3(language, 'Link gekopieerd!', 'Lien copié !', 'Link copied!'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 border border-primary/20 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-heading font-semibold text-foreground">
          {t3(language, 'Nodig vrienden uit', 'Invitez des amis', 'Invite friends')}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {t3(language,
          'Deel je persoonlijke code met vrienden. Wanneer zij een club volgen met jouw code en hun eerste taak voltooien, verdien je bonuspunten!',
          'Partagez votre code personnel avec vos amis. Quand ils suivent un club avec votre code et terminent leur première tâche, vous gagnez des points bonus !',
          'Share your personal code with friends. When they follow a club with your code and complete their first task, you earn bonus points!'
        )}
      </p>

      {/* Personal code */}
      <div className="flex gap-2">
        <code className="flex-1 px-3 py-2.5 rounded-lg bg-card text-sm text-foreground border border-border font-mono tracking-widest text-center font-semibold">
          {referralCode}
        </code>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" onClick={() => handleShare()}>
          <Share2 className="w-3.5 h-3.5" />
          {t3(language, 'Delen', 'Partager', 'Share')}
        </Button>
      </div>

      {/* Per-club referral stats */}
      {clubReferrals.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-foreground">
            {t3(language, 'Jouw referrals per club', 'Vos parrainages par club', 'Your referrals per club')}
          </p>
          {clubReferrals.map(cr => (
            <div key={cr.club_id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{cr.club_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {cr.pending_count > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {cr.pending_count} {t3(language, 'in afwachting', 'en attente', 'pending')}
                    </span>
                  )}
                  {cr.completed_count > 0 && (
                    <span className="text-[11px] text-primary flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> {cr.completed_count} {t3(language, 'voltooid', 'terminé', 'completed')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Trophy className="w-3 h-3" />
                  {cr.total_points_earned}/{cr.bonus_points} {t3(language, 'punten', 'points', 'points')}
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 mt-0.5" onClick={() => handleShare(cr.club_name)}>
                  <Share2 className="w-3 h-3 mr-1" />
                  {t3(language, 'Deel', 'Partager', 'Share')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {clubReferrals.length === 0 && (
        <p className="text-[11px] text-muted-foreground/70 italic">
          {t3(language,
            '💡 Volg clubs met een referral-programma om bonuspunten te verdienen voor elke vriend die je uitnodigt.',
            '💡 Suivez des clubs avec un programme de parrainage pour gagner des points bonus.',
            '💡 Follow clubs with a referral program to earn bonus points for each friend you invite.'
          )}
        </p>
      )}
    </motion.div>
  );
};

export default ReferralSection;
