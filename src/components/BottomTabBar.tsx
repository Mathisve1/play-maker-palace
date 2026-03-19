import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, MessageCircle, User, Inbox, Users, CalendarPlus, BarChart3, UserCheck, Handshake, FileSignature } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Language } from '@/i18n/translations';

type Role = 'volunteer' | 'club' | 'partner';

const volunteerTabs = (l: Record<string, string>) => [
  { icon: Home, label: l.home, path: '/dashboard', match: ['/dashboard'] },
  { icon: ClipboardList, label: l.tasks, path: '/dashboard?tab=mine', match: [] },
  { icon: CalendarPlus, label: l.calendar, path: '/dashboard?tab=monthly', match: [] },
  { icon: MessageCircle, label: l.chat, path: '/chat', match: ['/chat'] },
  { icon: FileSignature, label: l.profile, path: '/dashboard?tab=contracts', match: [] },
];

const clubTabs = (l: Record<string, string>) => [
  { icon: Home, label: l.home, path: '/club-dashboard', match: ['/club-dashboard'] },
  { icon: Inbox, label: l.actions, path: '/command-center', match: ['/command-center'] },
  { icon: CalendarPlus, label: l.events, path: '/events-manager', match: ['/events-manager'] },
  { icon: Users, label: l.volunteers, path: '/volunteer-management', match: ['/volunteer-management'] },
  { icon: MessageCircle, label: l.chat, path: '/chat', match: ['/chat'] },
];

const partnerTabs = (l: Record<string, string>) => [
  { icon: Home, label: l.home, path: '/partner-dashboard', match: ['/partner-dashboard'] },
  { icon: ClipboardList, label: l.tasks, path: '/partner-dashboard?tab=tasks', match: [] },
  { icon: UserCheck, label: l.attendance, path: '/partner-dashboard?tab=attendance', match: [] },
  { icon: Users, label: l.staff, path: '/partner-dashboard?tab=members', match: [] },
  { icon: User, label: l.profile, path: '/partner-dashboard?tab=profile', match: [] },
];

const tabLabels: Record<Language, Record<string, string>> = {
  nl: { home: 'Home', tasks: 'Taken', calendar: 'Kalender', chat: 'Chat', profile: 'Profiel', actions: 'Acties', events: 'Events', volunteers: 'Vrijwilligers', attendance: 'Aanwezigheid', staff: 'Team' },
  fr: { home: 'Accueil', tasks: 'Tâches', calendar: 'Calendrier', chat: 'Chat', profile: 'Profil', actions: 'Actions', events: 'Événements', volunteers: 'Bénévoles', attendance: 'Présences', staff: 'Équipe' },
  en: { home: 'Home', tasks: 'Tasks', calendar: 'Calendar', chat: 'Chat', profile: 'Profile', actions: 'Actions', events: 'Events', volunteers: 'Volunteers', attendance: 'Attendance', staff: 'Staff' },
};

function detectRole(pathname: string): Role | null {
  if (pathname.startsWith('/club-dashboard') || pathname.startsWith('/command-center') || pathname.startsWith('/events-manager') || pathname.startsWith('/volunteer-management') || pathname.startsWith('/reporting') || pathname.startsWith('/safety') || pathname.startsWith('/ticketing') || pathname.startsWith('/external-partners') || pathname.startsWith('/billing') || pathname.startsWith('/academy') || pathname.startsWith('/loyalty') || pathname.startsWith('/club-help')) return 'club';
  if (pathname.startsWith('/partner-dashboard')) return 'partner';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/chat') || pathname.startsWith('/task')) return 'volunteer';
  return null;
}

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const l = tabLabels[language];

  if (!isMobile) return null;

  const role = detectRole(location.pathname);
  if (!role) return null;

  const tabs = role === 'club' ? clubTabs(l) : role === 'partner' ? partnerTabs(l) : volunteerTabs(l);

  const isActive = (tab: typeof tabs[0]) => {
    const fullUrl = location.pathname + location.search;
    // Exact match for query-param tabs
    if (tab.path.includes('?')) {
      return fullUrl === tab.path;
    }
    // Path-prefix match for simple routes
    if (tab.match && tab.match.length > 0) {
      // Only match if there's no tab query param (so /dashboard matches Home but not /dashboard?tab=mine)
      const hasTabParam = new URLSearchParams(location.search).has('tab');
      return !hasTabParam && tab.match.some(m => location.pathname.startsWith(m));
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
        <div className="flex items-center justify-around h-[64px]">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[48px] min-w-[48px] transition-colors active:opacity-70",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6", active && "stroke-[2.5]")} />
                <span className="text-xs font-semibold tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
