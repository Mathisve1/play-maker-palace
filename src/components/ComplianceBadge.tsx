import { ShieldCheck, ShieldAlert, ShieldX, Clock } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { ComplianceStatus, YEARLY_LIMIT, HOURS_LIMIT } from '@/hooks/useComplianceData';
import { Progress } from '@/components/ui/progress';

interface ComplianceBadgeProps {
  compliance: ComplianceStatus | null;
  language: Language;
  compact?: boolean;
  showProgress?: boolean;
}

const labels = {
  nl: {
    green: 'Legaal',
    orange: 'Let op',
    red: 'Plafond bereikt',
    remaining: 'over',
    internal: 'Intern',
    external: 'Extern',
    margin: 'Marge',
    hours: 'uren',
    yearlyLimit: 'Jaarplafond',
    lastCheck: 'Laatste validatie',
    noCheck: 'Nog niet gevalideerd',
    onHold: 'On hold - Wacht op validatie',
    art17Required: 'RSZ verplicht (Art. 17)',
  },
  fr: {
    green: 'Légal',
    orange: 'Attention',
    red: 'Plafond atteint',
    remaining: 'restant',
    internal: 'Interne',
    external: 'Externe',
    margin: 'Marge',
    hours: 'heures',
    yearlyLimit: 'Plafond annuel',
    lastCheck: 'Dernière validation',
    noCheck: 'Pas encore validé',
    onHold: 'En attente - Validation requise',
    art17Required: 'ONSS obligatoire (Art. 17)',
  },
  en: {
    green: 'Legal',
    orange: 'Warning',
    red: 'Limit reached',
    remaining: 'remaining',
    internal: 'Internal',
    external: 'External',
    margin: 'Margin',
    hours: 'hours',
    yearlyLimit: 'Yearly limit',
    lastCheck: 'Last validation',
    noCheck: 'Not yet validated',
    onHold: 'On hold - Awaiting validation',
    art17Required: 'Social security required (Art. 17)',
  },
};

const ComplianceBadge = ({ compliance, language, compact = false, showProgress = false }: ComplianceBadgeProps) => {
  if (!compliance) return null;
  const t = labels[language];

  const statusConfig = {
    green: {
      icon: ShieldCheck,
      bg: 'bg-green-50 dark:bg-green-950/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
      iconColor: 'text-green-600',
      label: t.green,
      progressColor: 'bg-green-500',
    },
    orange: {
      icon: ShieldAlert,
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-400',
      iconColor: 'text-orange-600',
      label: t.orange,
      progressColor: 'bg-orange-500',
    },
    red: {
      icon: ShieldX,
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      iconColor: 'text-red-600',
      label: t.red,
      progressColor: 'bg-red-500',
    },
  };

  const config = statusConfig[compliance.status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.border} ${config.text}`}>
        <Icon className={`w-3 h-3 ${config.iconColor}`} />
        {config.label}
        <span className="opacity-75">€{compliance.remainingBudget.toFixed(0)} {t.remaining}</span>
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${config.text}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          {config.label}
        </span>
        <span className={`text-xs font-medium ${config.text}`}>
          €{compliance.totalIncome.toFixed(2)} / €{YEARLY_LIMIT.toFixed(2)}
        </span>
      </div>

      {showProgress && (
        <>
          {/* Stacked progress bar */}
          <div className="w-full h-3 rounded-full bg-muted/50 overflow-hidden flex mb-2">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${Math.min(100, (compliance.internalIncome / YEARLY_LIMIT) * 100)}%` }}
              title={`${t.internal}: €${compliance.internalIncome.toFixed(2)}`}
            />
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100 - (compliance.internalIncome / YEARLY_LIMIT) * 100, (compliance.externalIncome / YEARLY_LIMIT) * 100)}%` }}
              title={`${t.external}: €${compliance.externalIncome.toFixed(2)}`}
            />
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> {t.internal}: €{compliance.internalIncome.toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> {t.external}: €{compliance.externalIncome.toFixed(2)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted" /> {t.margin}: €{compliance.remainingBudget.toFixed(2)}
            </span>
          </div>

          {/* Hours progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Art. 17 {t.hours}</span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {compliance.totalHours?.toFixed(1) || 0}/{HOURS_LIMIT}h
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted/50 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, ((compliance.internalHours || 0) / HOURS_LIMIT) * 100)}%` }}
                title={`${t.internal}: ${(compliance.internalHours || 0).toFixed(1)}h`}
              />
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(100 - ((compliance.internalHours || 0) / HOURS_LIMIT) * 100, ((compliance.externalHours || 0) / HOURS_LIMIT) * 100)}%` }}
                title={`${t.external}: ${compliance.externalHours}h`}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t.internal}: {(compliance.internalHours || 0).toFixed(1)}h
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> {t.external}: {compliance.externalHours}h
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted" /> {t.margin}: {(compliance.remainingHours || 0).toFixed(1)}h
              </span>
            </div>
          </div>
        </>
      )}

      {compliance.declarationsPending && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400">
          <Clock className="w-3 h-3" />
          {t.onHold}
        </div>
      )}

      {compliance.status === 'red' && (
        <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400">
          ⚠️ {t.art17Required}
        </div>
      )}
    </div>
  );
};

export default ComplianceBadge;
