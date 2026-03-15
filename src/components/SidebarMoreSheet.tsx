import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  ShieldAlert, Ticket, Handshake, MessageCircle, Bell, CreditCard, Award, Heart,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

interface SidebarMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SidebarMoreSheet = ({ open, onOpenChange }: SidebarMoreSheetProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { setOpenMobile } = useSidebar();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const items = [
    { label: t('Safety & Security', 'Sécurité', 'Safety & Security'), icon: ShieldAlert, path: '/safety', color: 'text-orange-500' },
    { label: 'Ticketing', icon: Ticket, path: '/ticketing', color: 'text-purple-500' },
    { label: t('Partners', 'Partenaires', 'Partners'), icon: Handshake, path: '/external-partners', color: 'text-blue-500' },
    { label: t('Berichten', 'Messages', 'Messages'), icon: MessageCircle, path: '/chat', color: 'text-green-500' },
    { label: t('Notificaties', 'Notifications', 'Notifications'), icon: Bell, path: '/notifications', color: 'text-yellow-500' },
    { label: t('Facturatie', 'Facturation', 'Billing'), icon: CreditCard, path: '/billing', color: 'text-emerald-500' },
    { label: t('Academie', 'Académie', 'Academy'), icon: Award, path: '/academy', color: 'text-pink-500' },
    { label: t('Loyaliteit', 'Fidélité', 'Loyalty'), icon: Heart, path: '/loyalty', color: 'text-red-500' },
  ];

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setOpenMobile(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>{t('Meer', 'Plus', 'More')}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 mt-6">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-center"
            >
              <item.icon className={`w-6 h-6 ${item.color}`} />
              <span className="text-xs font-medium text-foreground leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SidebarMoreSheet;
