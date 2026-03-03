import { CalendarDays, Clock, Users, FileSignature, Ticket, Activity, Zap, Calendar } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { WIDGET_REGISTRY } from './widgetRegistry';

interface KpiWidgetProps {
  type: string;
  value: number;
  language: Language;
  onClick?: () => void;
}

const iconMap: Record<string, any> = {
  CalendarDays, Clock, Users, FileSignature, Ticket, Activity, Zap, Calendar,
};

const colorMap: Record<string, string> = {
  kpi_upcoming_events: 'text-primary bg-primary/10',
  kpi_pending_signups: 'text-yellow-600 bg-yellow-500/10',
  kpi_active_volunteers: 'text-accent-foreground bg-accent/10',
  kpi_unsigned_contracts: 'text-destructive bg-destructive/10',
};

export const KpiWidget = ({ type, value, language, onClick }: KpiWidgetProps) => {
  const def = WIDGET_REGISTRY[type];
  if (!def) return null;
  const Icon = iconMap[def.icon] || CalendarDays;
  const color = colorMap[type] || 'text-primary bg-primary/10';

  return (
    <button onClick={onClick} className="w-full h-full bg-card rounded-2xl border border-border p-5 text-left hover:border-primary/30 transition-colors flex flex-col justify-center">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{def.label[language] || def.label.en}</p>
    </button>
  );
};
