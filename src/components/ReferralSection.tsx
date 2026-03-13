import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Share2, Copy, Users, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface Props {
  userId: string;
  language: Language;
}

const ReferralSection = ({ userId, language }: Props) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
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
        // Generate and save code
        const code = userId.slice(0, 8).toUpperCase();
        await supabase.from('profiles').update({ referral_code: code } as any).eq('id', userId);
        setReferralCode(code);
      }

      // Count successful referrals
      const { count } = await (supabase as any)
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', userId)
        .eq('status', 'completed');

      setReferralCount(count || 0);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t3(language, 'Link gekopieerd!', 'Lien copié !', 'Link copied!'));
  };

  const handleShare = () => {
    const text = t3(language,
      'Word vrijwilliger via PlayMaker en help bij sportclubs! Gebruik mijn code:',
      'Devenez bénévole via PlayMaker ! Utilisez mon code :',
      'Become a volunteer via PlayMaker! Use my code:'
    );
    if (navigator.share) {
      navigator.share({ title: 'PlayMaker', text: `${text} ${referralCode}`, url: shareUrl });
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 border border-primary/20 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-heading font-semibold text-foreground">
          {t3(language, 'Nodig vrienden uit', 'Invitez des amis', 'Invite friends')}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {t3(language,
          'Deel je link en verdien bonuspunten wanneer je vrienden hun eerste taak voltooien!',
          'Partagez votre lien et gagnez des points bonus quand vos amis terminent leur première tâche !',
          'Share your link and earn bonus points when your friends complete their first task!'
        )}
      </p>

      <div className="flex gap-2">
        <code className="flex-1 px-3 py-2 rounded-lg bg-card text-xs text-foreground border border-border truncate">
          {referralCode}
        </code>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" onClick={handleShare}>
          <Share2 className="w-3.5 h-3.5" />
          {t3(language, 'Delen', 'Partager', 'Share')}
        </Button>
      </div>

      {referralCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-primary font-medium">
          <Users className="w-3.5 h-3.5" />
          {referralCount} {t3(language, 'vrienden uitgenodigd', 'amis invités', 'friends invited')}
          <Check className="w-3.5 h-3.5" />
        </div>
      )}
    </motion.div>
  );
};

export default ReferralSection;
