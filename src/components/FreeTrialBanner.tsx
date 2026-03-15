import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ArrowRight, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  clubId: string;
}

const bannerT = {
  nl: {
    free: 'Gratis testperiode',
    contractsLeft: (used: number, limit: number) => `nog ${limit - used} gratis contract${limit - used !== 1 ? 'en' : ''} beschikbaar`,
    expired: 'Je gratis periode is voorbij — contracten kosten nu €15/vrijwilliger/seizoen',
    moreInfo: 'Meer info',
  },
  fr: {
    free: 'Période d\'essai gratuite',
    contractsLeft: (used: number, limit: number) => `encore ${limit - used} contrat${limit - used !== 1 ? 's' : ''} gratuit${limit - used !== 1 ? 's' : ''} disponible${limit - used !== 1 ? 's' : ''}`,
    expired: 'Votre période d\'essai est terminée — les contrats coûtent maintenant €15/bénévole/saison',
    moreInfo: 'Plus d\'infos',
  },
  en: {
    free: 'Free trial',
    contractsLeft: (used: number, limit: number) => `${limit - used} free contract${limit - used !== 1 ? 's' : ''} remaining`,
    expired: 'Your free period has ended — contracts now cost €15/volunteer/season',
    moreInfo: 'More info',
  },
};

const FreeTrialBanner = ({ clubId }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = bannerT[language as keyof typeof bannerT] || bannerT.nl;
  const [billing, setBilling] = useState<{ free_contracts_used: number; free_contracts_limit: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const { data } = await supabase.from('club_billing').select('free_contracts_used, free_contracts_limit').eq('club_id', clubId).maybeSingle();
      if (data) setBilling(data);
    };
    load();
  }, [clubId]);

  if (!billing || dismissed) return null;

  const isFree = billing.free_contracts_used < billing.free_contracts_limit;
  const progress = (billing.free_contracts_used / billing.free_contracts_limit) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`relative rounded-xl border px-4 py-3 mb-6 flex items-center gap-4 ${
          isFree
            ? 'bg-primary/5 border-primary/20'
            : 'bg-orange-500/10 border-orange-500/30'
        }`}
      >
        <Gift className={`w-5 h-5 shrink-0 ${isFree ? 'text-primary' : 'text-orange-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isFree ? 'text-primary' : 'text-orange-600 dark:text-orange-400'}`}>
              {isFree ? t.free : ''}
            </span>
            <span className="text-sm text-foreground">
              {isFree
                ? t.contractsLeft(billing.free_contracts_used, billing.free_contracts_limit)
                : t.expired}
            </span>
          </div>
          {isFree && (
            <Progress value={progress} className="mt-2 h-1.5 max-w-xs" />
          )}
        </div>
        <button
          onClick={() => navigate('/billing')}
          className={`shrink-0 text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
            isFree
              ? 'text-primary hover:bg-primary/10'
              : 'bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30'
          }`}
        >
          {t.moreInfo} <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeTrialBanner;
