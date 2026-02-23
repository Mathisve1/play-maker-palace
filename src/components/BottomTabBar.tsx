import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, User, Ticket } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface TabItem {
  icon: React.ElementType;
  label: string;
  path: string;
  match?: string[];
}

const tabs: TabItem[] = [
  { icon: Home, label: 'Home', path: '/dashboard', match: ['/dashboard'] },
  { icon: Search, label: 'Taken', path: '/dashboard?tab=all', match: [] },
  { icon: Ticket, label: 'Tickets', path: '/dashboard?tab=tickets', match: [] },
  { icon: MessageCircle, label: 'Chat', path: '/chat', match: ['/chat'] },
  { icon: User, label: 'Profiel', path: '/dashboard?tab=profile', match: [] },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  // Only show on dashboard/chat pages (authenticated pages)
  const showOnPaths = ['/dashboard', '/chat', '/task'];
  const shouldShow = showOnPaths.some(p => location.pathname.startsWith(p));
  if (!shouldShow) return null;

  const isActive = (tab: TabItem) => {
    if (tab.match && tab.match.length > 0) {
      return tab.match.some(m => location.pathname.startsWith(m));
    }
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div
        className={cn(
          "bg-background/80 backdrop-blur-2xl border-t border-border/50",
          "pb-safe-bottom"
        )}
      >
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
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
