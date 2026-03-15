import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Euro, CreditCard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  clubId: string | null;
  language: Language;
}

const t3 = (l: Language, nl: string, fr: string, en: string) =>
  l === 'nl' ? nl : l === 'fr' ? fr : en;

export const RevenueWidget = ({ clubId, language }: Props) => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ billedVolunteers: number; seasonCost: number } | null>(null);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const { data: billing } = await supabase
        .from('club_billing')
        .select('current_season_volunteers_billed, volunteer_price_cents')
        .eq('club_id', clubId)
        .maybeSingle();

      if (!billing) {
        setData(null);
        return;
      }

      const billed = billing.current_season_volunteers_billed || 0;
      const priceCents = billing.volunteer_price_cents || 1500;
      const seasonCost = (billed * priceCents) / 100;

      setData({ billedVolunteers: billed, seasonCost });
    };
    load();
  }, [clubId]);

  if (!data) {
    return (
      <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">{t3(language, 'Billing niet actief', 'Facturation non active', 'Billing not active')}</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('/billing')}
      className="w-full h-full bg-card rounded-2xl border border-border p-4 text-left hover:shadow-md transition-all group"
    >
      <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Euro className="w-3.5 h-3.5 text-primary" />
        {t3(language, 'Seizoenskosten', 'Coûts saisonniers', 'Season Costs')}
      </p>

      {/* Billed volunteers */}
      <div className="mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {data.billedVolunteers} {t3(language, 'gefactureerd', 'facturés', 'billed')}
        </span>
      </div>

      {/* Season cost */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-lg font-bold text-foreground">€{data.seasonCost.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">{t3(language, 'Lopende kosten', 'Coûts en cours', 'Running costs')}</p>
        </div>
      </div>

      <p className="text-[10px] text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {t3(language, 'Billing bekijken →', 'Voir facturation →', 'View billing →')}
      </p>
    </button>
  );
};
