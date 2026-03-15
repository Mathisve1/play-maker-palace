import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ArrowRight, X, AlertTriangle, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  clubId: string;
}

const bannerT = {
  nl: {
    free: 'Per-vrijwilliger facturatie',
    model: 'Elke vrijwilliger mag 2 taken gratis voltooien per seizoen.',
    billedCount: (n: number) => `${n} vrijwilliger${n !== 1 ? 's' : ''} gefactureerd dit seizoen.`,
    noBilled: 'Nog geen vrijwilligers gefactureerd — iedereen zit binnen de gratis limiet.',
    cost: (n: number, cost: string) => `${n} × €15 = €${cost} dit seizoen.`,
    moreInfo: 'Meer info',
  },
  fr: {
    free: 'Facturation par bénévole',
    model: 'Chaque bénévole peut effectuer 2 tâches gratuitement par saison.',
    billedCount: (n: number) => `${n} bénévole${n !== 1 ? 's' : ''} facturé${n !== 1 ? 's' : ''} cette saison.`,
    noBilled: 'Aucun bénévole facturé — tout le monde est dans la limite gratuite.',
    cost: (n: number, cost: string) => `${n} × €15 = €${cost} cette saison.`,
    moreInfo: 'Plus d\'infos',
  },
  en: {
    free: 'Per-volunteer billing',
    model: 'Each volunteer can complete 2 tasks for free per season.',
    billedCount: (n: number) => `${n} volunteer${n !== 1 ? 's' : ''} billed this season.`,
    noBilled: 'No volunteers billed yet — everyone is within the free limit.',
    cost: (n: number, cost: string) => `${n} × €15 = €${cost} this season.`,
    moreInfo: 'More info',
  },
};

const FreeTrialBanner = ({ clubId }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = bannerT[language as keyof typeof bannerT] || bannerT.nl;
  const [billedCount, setBilledCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const { data } = await supabase
        .from('club_billing')
        .select('current_season_volunteers_billed')
        .eq('club_id', clubId)
        .maybeSingle();
      if (data) setBilledCount(data.current_season_volunteers_billed || 0);
    };
    load();
  }, [clubId]);

  if (billedCount === null || dismissed) return null;

  const hasBilled = billedCount > 0;
  const cost = (billedCount * 15).toFixed(2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`relative rounded-xl border px-4 py-3.5 mb-6 ${
          hasBilled
            ? 'bg-accent/10 border-accent/30'
            : 'bg-primary/5 border-primary/20'
        }`}
      >
        <div className="flex items-start gap-4">
          {hasBilled ? (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-accent-foreground" />
          ) : (
            <Gift className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${hasBilled ? 'text-accent-foreground' : 'text-primary'}`}>
                {t.free}
              </span>
            </div>
            <p className="text-sm text-foreground mt-1">
              {t.model}{' '}
              {hasBilled ? (
                <span className="font-medium text-accent-foreground">
                  {t.billedCount(billedCount)} {t.cost(billedCount, cost)}
                </span>
              ) : (
                <span className="font-medium text-primary">{t.noBilled}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className={`shrink-0 text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              hasBilled
                ? 'bg-accent/10 text-accent-foreground hover:bg-accent/20'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            {t.moreInfo} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeTrialBanner;
