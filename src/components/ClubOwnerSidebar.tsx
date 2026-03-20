import { useEffect, useState } from 'react';
import { useActionCount } from '@/hooks/useActionCount';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Inbox, CalendarPlus, BarChart3, LogOut,
  Search, User, Settings, MessageCircle, Bell, ShieldAlert, Ticket, Handshake,
  CreditCard, Award, Heart, HelpCircle, ScanLine, X, Layers,
} from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ClubOwnerSidebarProps {
  profile: { full_name: string; email: string; avatar_url?: string | null } | null;
  clubId?: string | null;
  clubInfo?: { name: string; logo_url: string | null } | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenMembers?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static sub-components (defined outside to avoid re-mounting on each render)
// ─────────────────────────────────────────────────────────────────────────────

interface NavItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  active: boolean;
  onClick: () => void;
}

const NavItem = ({ label, icon: Icon, badge, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'relative w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] transition-colors duration-100 group text-left',
      active
        ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-300'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
    )}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
    )}
    <Icon className={cn(
      'w-4 h-4 shrink-0 transition-colors',
      active
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
    )} />
    <span className="flex-1 truncate">{label}</span>
    {badge != null && badge > 0 && (
      <span className="text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none tabular-nums">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

const NavGroupLabel = ({ children }: { children: string }) => (
  <p className="px-3 pb-1 mt-5 first:mt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400/80 dark:text-gray-600 select-none">
    {children}
  </p>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main sidebar
// ─────────────────────────────────────────────────────────────────────────────

const ClubOwnerSidebar = ({
  profile, clubId, clubInfo, onLogout, onOpenProfile, onOpenSettings, onOpenMembers,
}: ClubOwnerSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openMobile, setOpenMobile } = useSidebar();
  const { language } = useLanguage();
  const { actionCount } = useActionCount(clubId || null);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const nav = (path: string) => { navigate(path); setOpenMobile(false); };
  const isActive = (path: string) => location.pathname === path;
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  useEffect(() => {
    if (!clubId) return;
    const fetchReviewCount = async () => {
      const { data: clubTasks } = await supabase.from('tasks').select('id').eq('club_id', clubId);
      if (clubTasks && clubTasks.length > 0) {
        const clubTaskIds = clubTasks.map((t: any) => t.id);
        const { data: completedSignups } = await supabase
          .from('task_signups')
          .select('id')
          .in('task_id', clubTaskIds)
          .eq('status', 'completed');

        if (completedSignups && completedSignups.length > 0) {
          const sIds = completedSignups.map(s => s.id);
          const { data: existingReviews } = await (supabase as any)
            .from('task_reviews')
            .select('task_signup_id')
            .eq('reviewer_role', 'club')
            .in('task_signup_id', sIds);
          const reviewedIds = new Set((existingReviews || []).map((r: any) => r.task_signup_id));
          setPendingReviewCount(sIds.filter(id => !reviewedIds.has(id)).length);
        } else {
          setPendingReviewCount(0);
        }
      } else {
        setPendingReviewCount(0);
      }
    };
    fetchReviewCount();

    const channel = supabase
      .channel('sidebar-review-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_signups' }, fetchReviewCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  const mainItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/club-dashboard' },
    { label: t3('Actielijst', "Liste d'actions", 'Action List'), icon: Inbox, path: '/command-center', badge: actionCount },
    { label: t3('Evenementen', 'Événements', 'Events'), icon: CalendarPlus, path: '/events-manager' },
    { label: t3('Vrijwilligers', 'Bénévoles', 'Volunteers'), icon: Users, path: '/volunteer-management', badge: pendingReviewCount },
    { label: t3('Rapporten', 'Rapports', 'Reports'), icon: BarChart3, path: '/reporting' },
  ];

  const commsItems = [
    { label: t3('Berichten', 'Messages', 'Messages'), icon: MessageCircle, path: '/chat' },
    { label: t3('Notificaties', 'Notifications', 'Notifications'), icon: Bell, path: '/notifications' },
  ];

  const beheerItems = [
    { label: t3('Sjablonen', 'Modèles', 'Templates'), icon: Layers, path: '/shift-templates' },
    { label: t3('Safety & Security', 'Sécurité', 'Safety & Security'), icon: ShieldAlert, path: '/safety' },
    { label: 'Ticketing', icon: Ticket, path: '/ticketing' },
    { label: t3('Partners', 'Partenaires', 'Partners'), icon: Handshake, path: '/external-partners' },
    { label: t3('Facturatie', 'Facturation', 'Billing'), icon: CreditCard, path: '/billing' },
    { label: t3('Academie', 'Académie', 'Academy'), icon: Award, path: '/academy' },
    { label: t3('Loyaliteit', 'Fidélité', 'Loyalty'), icon: Heart, path: '/loyalty' },
    { label: t3('Kassa & Pasjes', 'Caisse & Cartes', 'POS & Cards'), icon: ScanLine, path: '/kassa-pasjes' },
  ];

  // ── Render helpers (plain functions, not components — no hooks inside) ──────

  const renderHeader = (withClose = false) => (
    <div className="shrink-0 px-4 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <Logo size="sm" linkTo="/club-dashboard" />
        {withClose && (
          <button
            onClick={() => setOpenMobile(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {clubInfo && (
        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 bg-blue-50 dark:bg-blue-950 flex items-center justify-center overflow-hidden">
            {clubInfo.logo_url
              ? <img src={clubInfo.logo_url} alt={clubInfo.name} className="w-full h-full object-cover" />
              : <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400">{clubInfo.name[0]}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{clubInfo.name}</p>
            <p className="text-[10px] text-gray-400 leading-tight">Club Dashboard</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderNav = () => (
    <>
      {/* Search */}
      <div className="shrink-0 px-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 ring-1 ring-gray-200/80 dark:ring-white/5 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="flex-1 text-left text-[11px] text-gray-400">
            {t3('Zoeken...', 'Rechercher...', 'Search...')}
          </span>
          <kbd className="hidden md:inline text-[9px] font-mono text-gray-300 dark:text-gray-600">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
        <NavGroupLabel>{t3('Navigatie', 'Navigation', 'Navigation')}</NavGroupLabel>
        {mainItems.map(item => (
          <NavItem
            key={item.path}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            active={isActive(item.path)}
            onClick={() => nav(item.path)}
          />
        ))}

        <NavGroupLabel>{t3('Communicatie', 'Communication', 'Communication')}</NavGroupLabel>
        {commsItems.map(item => (
          <NavItem
            key={item.path}
            label={item.label}
            icon={item.icon}
            active={isActive(item.path)}
            onClick={() => nav(item.path)}
          />
        ))}

        <NavGroupLabel>{t3('Beheer', 'Gestion', 'Management')}</NavGroupLabel>
        {beheerItems.map(item => (
          <NavItem
            key={item.path}
            label={item.label}
            icon={item.icon}
            active={isActive(item.path)}
            onClick={() => nav(item.path)}
          />
        ))}
      </nav>
    </>
  );

  const renderFooter = () => (
    <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-2 pt-2 pb-3 space-y-0.5">
      {onOpenProfile && (
        <button
          onClick={() => { onOpenProfile(); setOpenMobile(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-100 transition-colors"
        >
          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {t3('Mijn profiel', 'Mon profil', 'My profile')}
        </button>
      )}
      {onOpenMembers && (
        <button
          onClick={() => { onOpenMembers(); setOpenMobile(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-100 transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {t3('Leden', 'Membres', 'Members')}
        </button>
      )}
      {onOpenSettings && (
        <button
          onClick={() => { onOpenSettings(); setOpenMobile(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-100 transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {t3('Instellingen', 'Paramètres', 'Settings')}
        </button>
      )}
      <button
        onClick={() => nav('/club-help')}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-100 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        {t3('Help', 'Aide', 'Help')}
      </button>

      {/* User row */}
      <div className="mt-1 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2.5 px-2">
        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-gray-200 dark:ring-gray-700">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate leading-tight">
            {profile?.full_name}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight">
            {profile?.email}
          </p>
        </div>
        <button
          onClick={onLogout}
          title={t3('Uitloggen', 'Déconnexion', 'Log out')}
          className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} clubId={clubId} isClubOwner={true} />

      {/* Desktop: sticky full-height sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 h-screen sticky top-0 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 z-30 overflow-hidden">
        {renderHeader()}
        {renderNav()}
        {renderFooter()}
      </aside>

      {/* Mobile: backdrop + slide-in drawer */}
      {openMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setOpenMobile(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] bg-white dark:bg-gray-950 shadow-2xl md:hidden overflow-hidden">
            {renderHeader(true)}
            {renderNav()}
            {renderFooter()}
          </aside>
        </>
      )}
    </>
  );
};

export default ClubOwnerSidebar;
