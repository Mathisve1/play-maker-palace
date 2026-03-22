import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ClipboardList, Wallet, TrendingUp, CalendarDays,
  Inbox, CalendarPlus, Users, MessageCircle, UserCheck, User,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Language } from '@/i18n/translations';

type Role = 'volunteer' | 'club' | 'partner';

// ── Volunteer tabs — tabKey maps directly to the ?tab= URL param ──────────────
// 'dashboard' = no param (home tab)
const volunteerTabDefs = (l: Record<string, string>) => [
  { icon: Home,          label: l.home,     tabKey: 'dashboard' },
  { icon: ClipboardList, label: l.tasks,    tabKey: 'mine'      },
  { icon: Wallet,        label: l.wallet,   tabKey: 'payments'  },
  { icon: TrendingUp,    label: l.grow,     tabKey: 'grow'      },
  { icon: CalendarDays,  label: l.calendar, tabKey: 'monthly'   },
];

// ── Club tabs — path-based navigation (unchanged from original) ───────────────
const clubTabs = (l: Record<string, string>) => [
  { icon: Home,         label: l.home,       path: '/club-dashboard',  match: ['/club-dashboard'] },
  { icon: Inbox,        label: l.actions,    path: '/command-center',  match: ['/command-center'] },
  { icon: CalendarPlus, label: l.events,     path: '/events-manager',  match: ['/events-manager'] },
  { icon: Users,        label: l.volunteers, path: '/volunteer-management', match: ['/volunteer-management'] },
  { icon: MessageCircle,label: l.chat,       path: '/chat',            match: ['/chat'] },
];

// ── Partner tabs ───────────────────────────────────────────────────────────────
const partnerTabs = (l: Record<string, string>) => [
  { icon: Home,         label: l.home,       path: '/partner-dashboard',                  match: ['/partner-dashboard'] },
  { icon: ClipboardList,label: l.tasks,      path: '/partner-dashboard?tab=tasks',        match: [] },
  { icon: UserCheck,    label: l.attendance, path: '/partner-dashboard?tab=attendance',   match: [] },
  { icon: Users,        label: l.staff,      path: '/partner-dashboard?tab=members',      match: [] },
  { icon: User,         label: l.profile,    path: '/partner-dashboard?tab=profile',      match: [] },
];

const tabLabels: Record<Language, Record<string, string>> = {
  nl: {
    home: 'Home', tasks: 'Taken', wallet: 'Wallet', grow: 'Groeien', calendar: 'Kalender',
    chat: 'Chat', actions: 'Acties', events: 'Events', volunteers: 'Vrijwilligers',
    attendance: 'Aanwezigheid', staff: 'Team', profile: 'Profiel',
  },
  fr: {
    home: 'Accueil', tasks: 'Tâches', wallet: 'Wallet', grow: 'Progresser', calendar: 'Calendrier',
    chat: 'Chat', actions: 'Actions', events: 'Événements', volunteers: 'Bénévoles',
    attendance: 'Présences', staff: 'Équipe', profile: 'Profil',
  },
  en: {
    home: 'Home', tasks: 'Tasks', wallet: 'Wallet', grow: 'Grow', calendar: 'Calendar',
    chat: 'Chat', actions: 'Actions', events: 'Events', volunteers: 'Volunteers',
    attendance: 'Attendance', staff: 'Staff', profile: 'Profile',
  },
};

function detectRole(pathname: string): Role | null {
  if (
    pathname.startsWith('/club-dashboard') || pathname.startsWith('/command-center') ||
    pathname.startsWith('/events-manager') || pathname.startsWith('/volunteer-management') ||
    pathname.startsWith('/reporting') || pathname.startsWith('/safety') ||
    pathname.startsWith('/ticketing') || pathname.startsWith('/external-partners') ||
    pathname.startsWith('/billing') || pathname.startsWith('/academy') ||
    pathname.startsWith('/loyalty') || pathname.startsWith('/club-help') ||
    pathname.startsWith('/auto-assign') || pathname.startsWith('/sponsor-hub')
  ) return 'club';
  if (pathname.startsWith('/partner-dashboard')) return 'partner';
  if (
    pathname.startsWith('/dashboard') || pathname.startsWith('/chat') ||
    pathname.startsWith('/task') || pathname.startsWith('/my-clubs')
  ) return 'volunteer';
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

  // ── PREMIUM VOLUNTEER NAV ────────────────────────────────────────────────────
  if (role === 'volunteer') {
    const tabs = volunteerTabDefs(l);
    const activeTabParam = new URLSearchParams(location.search).get('tab') || 'dashboard';

    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden no-select"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-background/80 dark:bg-background/90 backdrop-blur-2xl border-t border-border/30 shadow-[0_-8px_32px_rgba(0,0,0,0.06)]">
          <div
            className="flex items-center justify-around h-[72px]"
            style={{
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
            }}
          >
            {tabs.map((tab) => {
              const active = activeTabParam === tab.tabKey;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.tabKey}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => {
                    if (tab.tabKey === 'dashboard') {
                      navigate('/dashboard');
                    } else {
                      navigate({ pathname: '/dashboard', search: `?tab=${tab.tabKey}` });
                    }
                  }}
                  className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[48px] min-w-0"
                >
                  {/* Sliding active background pill */}
                  {active && (
                    <motion.div
                      layoutId="vol-tab-pill"
                      className="absolute inset-x-1 top-2 bottom-1.5 rounded-2xl bg-primary/10 dark:bg-primary/15"
                      transition={{ type: 'spring', stiffness: 420, damping: 35 }}
                    />
                  )}

                  {/* Icon with scale + glow on active */}
                  <motion.div
                    animate={active ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    <Icon
                      className={cn(
                        'w-[22px] h-[22px] transition-colors duration-150',
                        active ? 'text-primary stroke-[2.5]' : 'text-muted-foreground stroke-2',
                      )}
                      style={
                        active
                          ? { filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.55))' }
                          : undefined
                      }
                    />
                  </motion.div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-wide relative z-10 transition-colors duration-150 truncate max-w-full px-0.5',
                      active ? 'text-primary' : 'text-muted-foreground/70',
                    )}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  // ── CLUB & PARTNER NAV (original logic, updated height + glass) ──────────────
  const tabs = role === 'club' ? clubTabs(l) : partnerTabs(l);

  const isActive = (tab: (typeof tabs)[0]) => {
    const fullUrl = location.pathname + location.search;
    if ((tab as any).path.includes('?')) {
      return fullUrl === (tab as any).path;
    }
    const hasTabParam = new URLSearchParams(location.search).has('tab');
    return (
      !hasTabParam &&
      ((tab as any).match as string[]).some((m: string) =>
        location.pathname.startsWith(m),
      )
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden no-select"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-background/80 backdrop-blur-2xl border-t border-border/40">
        <div
          className="flex items-center justify-around h-[72px]"
          style={{
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => navigate((tab as any).path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[48px] min-w-0 transition-colors active:opacity-70',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'w-[22px] h-[22px]',
                    active && 'stroke-[2.5]',
                  )}
                />
                <span className="text-[10px] font-semibold tracking-wide truncate max-w-full px-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
