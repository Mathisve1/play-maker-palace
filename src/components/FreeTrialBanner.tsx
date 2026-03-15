import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  clubId: string;
}

const bannerT = {
  nl: {
    free: 'Gratis testperiode',
    used: (used: number, limit: number) => `Je hebt ${used} van je ${limit} gratis contracttypes gebruikt.`,
    remaining: (left: number) => `Nog ${left} gratis over.`,
    expired: 'Vanaf je volgende contract betaal je €15 per vrijwilliger per seizoen.',
    moreInfo: 'Meer info',
  },
  fr: {
    free: 'Période d\'essai gratuite',
    used: (used: number, limit: number) => `Vous avez utilisé ${used} de vos ${limit} types de contrats gratuits.`,
    remaining: (left: number) => `Encore ${left} gratuit${left !== 1 ? 's' : ''}.`,
    expired: 'À partir de votre prochain contrat, vous payez €15 par bénévole par saison.',
    moreInfo: 'Plus d\'infos',
  },
  en: {
    free: 'Free trial',
    used: (used: number, limit: number) => `You've used ${used} of your ${limit} free contract types.`,
    remaining: (left: number) => `${left} free remaining.`,
    expired: 'From your next contract you pay €15 per volunteer per season.',
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

  const used = billing.free_contracts_used;
  const limit = billing.free_contracts_limit;
  const left = Math.max(limit - used, 0);
  const isFree = used < limit;
  const progress = (used / limit) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`relative rounded-xl border px-4 py-3.5 mb-6 ${
          isFree
            ? 'bg-primary/5 border-primary/20'
            : 'bg-destructive/5 border-destructive/30'
        }`}
      >
        <div className="flex items-start gap-4">
          {isFree ? (
            <Gift className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${isFree ? 'text-primary' : 'text-destructive'}`}>
                {t.free}
              </span>
            </div>
            <p className="text-sm text-foreground mt-1">
              {t.used(used, limit)}{' '}
              {isFree ? (
                <span className="font-medium text-primary">{t.remaining(left)}</span>
              ) : (
                <span className="font-medium text-destructive">{t.expired}</span>
              )}
            </p>

            {/* Progress bar with step indicators */}
            <div className="mt-3 max-w-xs">
              <Progress value={progress} className="h-2.5" />
              <div className="flex justify-between mt-1.5">
                {Array.from({ length: limit + 1 }, (_, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-medium ${
                      i <= used
                        ? isFree ? 'text-primary' : 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className={`shrink-0 text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              isFree
                ? 'text-primary hover:bg-primary/10'
                : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
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
