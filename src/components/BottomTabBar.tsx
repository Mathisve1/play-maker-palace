import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, User, Ticket } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Language } from '@/i18n/translations';

const tabLabels: Record<Language, { home: string; tasks: string; tickets: string; chat: string; profile: string }> = {
  nl: { home: 'Home', tasks: 'Taken', tickets: 'Tickets', chat: 'Chat', profile: 'Profiel' },
  fr: { home: 'Accueil', tasks: 'Tâches', tickets: 'Tickets', chat: 'Chat', profile: 'Profil' },
  en: { home: 'Home', tasks: 'Tasks', tickets: 'Tickets', chat: 'Chat', profile: 'Profile' },
};

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const l = tabLabels[language];

  if (!isMobile) return null;

  const showOnPaths = ['/dashboard', '/chat', '/task'];
  const shouldShow = showOnPaths.some(p => location.pathname.startsWith(p));
  if (!shouldShow) return null;

  const tabs = [
    { icon: Home, label: l.home, path: '/dashboard', match: ['/dashboard'] },
    { icon: Search, label: l.tasks, path: '/dashboard?tab=all', match: [] },
    { icon: Ticket, label: l.tickets, path: '/dashboard?tab=tickets', match: [] },
    { icon: MessageCircle, label: l.chat, path: '/chat', match: ['/chat'] },
    { icon: User, label: l.profile, path: '/dashboard?tab=profile', match: [] },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.match && tab.match.length > 0) {
      return tab.match.some(m => location.pathname.startsWith(m));
    }
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden no-select"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="bg-background/95 backdrop-blur-2xl border-t border-border/50"
        style={{ WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="flex items-center justify-around h-[52px]">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[44px] min-w-[44px] transition-colors active:opacity-70",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
