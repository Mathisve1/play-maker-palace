import { motion } from 'framer-motion';
import { Plus, X, CalendarDays, Clock, Users, FileSignature, Ticket, Zap, Calendar, MessageCircle, Shield, Euro, BarChart3, GraduationCap, CalendarRange, Inbox, CreditCard } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { WidgetDefinition } from './widgetRegistry';

interface WidgetLibraryProps {
  availableWidgets: WidgetDefinition[];
  language: Language;
  onAdd: (type: string) => void;
  onClose: () => void;
}

const iconMap: Record<string, any> = {
  CalendarDays, Clock, Users, FileSignature, Ticket, Activity: MessageCircle, Zap, Calendar, Shield, Euro, BarChart3, GraduationCap,
};

const categoryLabels: Record<string, Record<string, string>> = {
  kpi: { nl: 'KPI\'s', en: 'KPIs', fr: 'KPIs' },
  overview: { nl: 'Overzicht', en: 'Overview', fr: 'Aperçu' },
  shortcuts: { nl: 'Snelkoppelingen', en: 'Shortcuts', fr: 'Raccourcis' },
  activity: { nl: 'Activiteit', en: 'Activity', fr: 'Activité' },
};

const categoryEmoji: Record<string, string> = {
  kpi: '📊',
  overview: '👁️',
  shortcuts: '⚡',
  activity: '🔔',
};

export const WidgetLibrary = ({ availableWidgets, language, onAdd, onClose }: WidgetLibraryProps) => {
  const grouped = availableWidgets.reduce((acc, w) => {
    if (!acc[w.category]) acc[w.category] = [];
    acc[w.category].push(w);
    return acc;
  }, {} as Record<string, WidgetDefinition[]>);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            {language === 'nl' ? 'Widget bibliotheek' : language === 'fr' ? 'Bibliothèque de widgets' : 'Widget library'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {availableWidgets.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              {language === 'nl' ? '✅ Alle widgets zijn al toegevoegd aan je dashboard.' : 'All widgets have been added to your dashboard.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, widgets]) => (
              <div key={cat}>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2 tracking-wider flex items-center gap-1.5">
                  <span>{categoryEmoji[cat] || '📦'}</span>
                  {categoryLabels[cat]?.[language] || cat}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {widgets.map(w => {
                    const Icon = iconMap[w.icon] || CalendarDays;
                    return (
                      <button
                        key={w.type}
                        onClick={() => onAdd(w.type)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{w.label[language] || w.label.en}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{w.description[language] || w.description.en}</p>
                        </div>
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Plus className="w-3 h-3 text-primary" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
