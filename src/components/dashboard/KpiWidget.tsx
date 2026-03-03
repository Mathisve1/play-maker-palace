import { CalendarDays, Clock, Users, FileSignature, Ticket, Shield, Euro, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { WIDGET_REGISTRY } from './widgetRegistry';

interface KpiWidgetProps {
  type: string;
  value: number;
  language: Language;
  onClick?: () => void;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const iconMap: Record<string, any> = {
  CalendarDays, Clock, Users, FileSignature, Ticket, Shield, Euro, BarChart3,
};

const colorMap: Record<string, { icon: string; bg: string; accent: string }> = {
  kpi_upcoming_events: { icon: 'text-primary', bg: 'bg-primary/10', accent: 'border-primary/20' },
  kpi_pending_signups: { icon: 'text-yellow-600', bg: 'bg-yellow-500/10', accent: 'border-yellow-500/20' },
  kpi_active_volunteers: { icon: 'text-green-600', bg: 'bg-green-500/10', accent: 'border-green-500/20' },
  kpi_unsigned_contracts: { icon: 'text-destructive', bg: 'bg-destructive/10', accent: 'border-destructive/20' },
  kpi_pending_enrollments: { icon: 'text-blue-600', bg: 'bg-blue-500/10', accent: 'border-blue-500/20' },
  kpi_day_signups_pending: { icon: 'text-orange-600', bg: 'bg-orange-500/10', accent: 'border-orange-500/20' },
};

export const KpiWidget = ({ type, value, language, onClick, subtitle, trend }: KpiWidgetProps) => {
  const def = WIDGET_REGISTRY[type];
  if (!def) return null;
  const Icon = iconMap[def.icon] || CalendarDays;
  const colors = colorMap[type] || { icon: 'text-primary', bg: 'bg-primary/10', accent: 'border-primary/20' };

  return (
    <button
      onClick={onClick}
      className={`w-full h-full bg-card rounded-2xl border ${colors.accent} p-5 text-left hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col justify-between group`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} group-hover:scale-105 transition-transform`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        {trend && trend !== 'neutral' && (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trend === 'up' ? 'text-green-600' : 'text-destructive'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div className="mt-auto pt-3">
        <p className="text-3xl font-heading font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{subtitle || def.label[language] || def.label.en}</p>
      </div>
      {onClick && (
        <p className="text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {language === 'nl' ? 'Bekijk →' : 'View →'}
        </p>
      )}
    </button>
  );
};
