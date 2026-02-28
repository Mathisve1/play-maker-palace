import { motion } from 'framer-motion';
import { FileSignature, ClipboardList, Award, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface ActivityItem {
  id: string;
  type: 'contract' | 'briefing' | 'training' | 'partner_invite';
  title: string;
  subtitle?: string;
  action: () => void;
  actionLabel: string;
  urgent?: boolean;
}

interface Props {
  items: ActivityItem[];
  language: Language;
}

const icons = {
  contract: FileSignature,
  briefing: ClipboardList,
  training: Award,
  partner_invite: Users,
};

const colors = {
  contract: 'text-yellow-600 bg-yellow-500/10',
  briefing: 'text-primary bg-primary/10',
  training: 'text-purple-600 bg-purple-500/10',
  partner_invite: 'text-blue-600 bg-blue-500/10',
};

const labels: Record<Language, { title: string; empty: string }> = {
  nl: { title: 'Actiepunten', empty: 'Geen openstaande actiepunten 🎉' },
  fr: { title: 'Points d\'action', empty: 'Aucune action en cours 🎉' },
  en: { title: 'Action items', empty: 'No action items 🎉' },
};

const VolunteerActivitiesSection = ({ items, language }: Props) => {
  const l = labels[language];

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-heading font-semibold text-foreground">{l.title}</h2>
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const Icon = icons[item.type];
          const colorClass = colors[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={item.action}
              className={`bg-card rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${
                item.urgent ? 'border-yellow-500/30' : 'border-border'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary">
                <span className="hidden sm:inline">{item.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default VolunteerActivitiesSection;
