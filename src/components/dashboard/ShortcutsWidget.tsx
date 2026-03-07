import { useNavigate } from 'react-router-dom';
import { Language } from '@/i18n/translations';
import {
  Calendar, ClipboardList, Shield, MessageCircle, BarChart3,
  Users, FileSignature, Ticket, Gift, Handshake, GraduationCap,
} from 'lucide-react';

interface ShortcutsWidgetProps {
  language: Language;
}

const shortcuts = [
  { icon: Calendar, path: '/events-manager', label: { nl: 'Evenementen & Taken', en: 'Events & Tasks', fr: 'Événements & Tâches' }, color: 'text-primary bg-primary/10' },
  { icon: ClipboardList, path: '/planning', label: { nl: 'Planning', en: 'Planning', fr: 'Planning' }, color: 'text-blue-600 bg-blue-500/10' },
  { icon: Shield, path: '/safety', label: { nl: 'Safety & Security', en: 'Safety & Security', fr: 'Sécurité' }, color: 'text-green-600 bg-green-500/10' },
  { icon: MessageCircle, path: '/chat', label: { nl: 'Berichten', en: 'Messages', fr: 'Messages' }, color: 'text-purple-600 bg-purple-500/10' },
  { icon: BarChart3, path: '/reporting', label: { nl: 'Rapportering', en: 'Reporting', fr: 'Rapports' }, color: 'text-orange-600 bg-orange-500/10' },
  { icon: Users, path: '/compliance', label: { nl: 'Compliance', en: 'Compliance', fr: 'Conformité' }, color: 'text-teal-600 bg-teal-500/10' },
  { icon: FileSignature, path: '/contract-builder', label: { nl: 'Contracten', en: 'Contracts', fr: 'Contrats' }, color: 'text-indigo-600 bg-indigo-500/10' },
  { icon: Ticket, path: '/ticketing', label: { nl: 'Ticketing', en: 'Ticketing', fr: 'Billetterie' }, color: 'text-pink-600 bg-pink-500/10' },
  { icon: Gift, path: '/loyalty', label: { nl: 'Loyaliteit', en: 'Loyalty', fr: 'Fidélité' }, color: 'text-amber-600 bg-amber-500/10' },
  { icon: Handshake, path: '/external-partners', label: { nl: 'Partners', en: 'Partners', fr: 'Partenaires' }, color: 'text-cyan-600 bg-cyan-500/10' },
  { icon: GraduationCap, path: '/academy', label: { nl: 'Academie', en: 'Academy', fr: 'Académie' }, color: 'text-emerald-600 bg-emerald-500/10' },
];

export const ShortcutsWidget = ({ language }: ShortcutsWidgetProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-card rounded-2xl border border-border p-4 overflow-auto">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        ⚡ {language === 'nl' ? 'Snelkoppelingen' : language === 'fr' ? 'Raccourcis' : 'Shortcuts'}
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {shortcuts.map(s => (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted/50 transition-colors text-center"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight">{s.label[language] || s.label.en}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
