import { useState } from 'react';
import NotificationBell from '@/components/NotificationBell';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, ClipboardList, MessageCircle, Users,
  CreditCard, FileSignature, LogOut, HelpCircle, CalendarDays, TrendingUp, LayoutList,
} from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';
import { useOptionalClubContext } from '@/contexts/ClubContext';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { Language } from '@/i18n/translations';

export type VolunteerTab = 'dashboard' | 'mine' | 'monthly' | 'contracts' | 'payments' | 'grow';

interface VolunteerSidebarProps {
  activeTab: VolunteerTab;
  setActiveTab: (tab: VolunteerTab) => void;
  profile: { full_name: string; email: string; avatar_url?: string | null } | null;
  language: Language;
  onLogout: () => void;
  onOpenProfile: () => void;
  userId?: string;
  counts?: {
    pending?: number;
    assigned?: number;
    contracts?: number;
    payments?: number;
    loyalty?: number;
  };
}

const labels: Record<Language, Record<string, string>> = {
  nl: {
    dashboard: 'Dashboard',
    myTasks: 'Mijn Taken',
    calendar: 'Kalender',
    contracts: 'Contracten',
    payments: 'Vergoedingen',
    grow: 'Groeien',
    clubs: 'Clubs',
    messages: 'Berichten',
    settings: 'Instellingen',
    help: 'Hulp nodig?',
    logout: 'Uitloggen',
    overview: 'Overzicht',
    manage: 'Beheer',
    community: 'Community',
    details: 'Mijn Details & Voorkeuren',
  },
  fr: {
    dashboard: 'Tableau de bord',
    myTasks: 'Mes tâches',
    calendar: 'Calendrier',
    contracts: 'Contrats',
    payments: 'Remboursements',
    grow: 'Progresser',
    clubs: 'Clubs',
    messages: 'Messages',
    settings: 'Paramètres',
    help: 'Besoin d\'aide?',
    logout: 'Déconnexion',
    overview: 'Aperçu',
    manage: 'Gestion',
    community: 'Communauté',
    details: 'Mes Détails & Préférences',
  },
  en: {
    dashboard: 'Dashboard',
    myTasks: 'My Tasks',
    calendar: 'Calendar',
    contracts: 'Contracts',
    payments: 'Payments',
    grow: 'Grow',
    clubs: 'Clubs',
    messages: 'Messages',
    settings: 'Settings',
    help: 'Need help?',
    logout: 'Log out',
    overview: 'Overview',
    manage: 'Manage',
    community: 'Community',
    details: 'My Details & Preferences',
  },
};

const VolunteerSidebar = ({
  activeTab, setActiveTab, profile, language, onLogout, onOpenProfile, userId, counts = {},
}: VolunteerSidebarProps) => {
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const l = labels[language];
  const [searchOpen, setSearchOpen] = useState(false);
  const clubCtx = useOptionalClubContext();

  const handleNav = (tab: VolunteerTab) => {
    setActiveTab(tab);
    setOpenMobile(false);
  };

  const handleExternalNav = (path: string) => {
    navigate(path);
    setOpenMobile(false);
  };

  const Badge = ({ count }: { count?: number }) => {
    if (!count) return null;
    return (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
        {count}
      </span>
    );
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="p-4 pb-2">
        <div className="hidden md:flex items-center justify-between">
          <Logo size="sm" linkTo="/dashboard" />
          {userId && <NotificationBell userId={userId} />}
        </div>
        <button
          onClick={onOpenProfile}
          className="mt-3 flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-sidebar-accent transition-colors w-full text-left min-h-[48px]"
        >
          <Avatar className="h-11 w-11 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />}
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-sidebar-foreground truncate">{profile?.full_name || profile?.email || ''}</p>
            <p className="text-sm text-muted-foreground truncate">{l.settings}</p>
          </div>
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="mt-2 flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors min-h-[44px]"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{language === 'nl' ? 'Zoeken...' : language === 'fr' ? 'Rechercher...' : 'Search...'}</span>
          <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </button>
      </SidebarHeader>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} clubId={clubCtx?.clubId} isClubOwner={false} />

      <SidebarSeparator />

      <SidebarContent>
        {/* Overview group */}
        <SidebarGroup>
          <SidebarGroupLabel>{l.overview}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'dashboard'} onClick={() => handleNav('dashboard')} className="min-h-[48px]">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>{l.dashboard}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem data-tour="vol-sidebar-tasks">
                <SidebarMenuButton isActive={activeTab === 'mine'} onClick={() => handleNav('mine')} className="min-h-[48px]">
                  <ClipboardList className="w-5 h-5" />
                  <span>{l.myTasks}</span>
                  <Badge count={(counts.pending || 0) + (counts.assigned || 0)} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'monthly'} onClick={() => handleNav('monthly')} className="min-h-[48px]">
                  <CalendarDays className="w-5 h-5" />
                  <span>{l.calendar}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manage group */}
        <SidebarGroup>
          <SidebarGroupLabel>{l.manage}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem data-tour="vol-sidebar-contracts">
                <SidebarMenuButton isActive={activeTab === 'contracts'} onClick={() => handleNav('contracts')} className="min-h-[48px]">
                  <FileSignature className="w-5 h-5" />
                  <span>{l.contracts}</span>
                  <Badge count={counts.contracts} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'payments'} onClick={() => handleNav('payments')} className="min-h-[48px]">
                  <CreditCard className="w-5 h-5" />
                  <span>{l.payments}</span>
                  <Badge count={counts.payments} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'grow'} onClick={() => handleNav('grow')} className="min-h-[48px]">
                  <TrendingUp className="w-5 h-5" />
                  <span>{l.grow}</span>
                  <Badge count={counts.loyalty} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleExternalNav('/volunteer-details')} className="min-h-[48px]">
                  <LayoutList className="w-5 h-5" />
                  <span>{l.details}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Community group */}
        <SidebarGroup>
          <SidebarGroupLabel>{l.community}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem data-tour="vol-sidebar-clubs">
                <SidebarMenuButton onClick={() => handleExternalNav('/community')} className="min-h-[48px]">
                  <Users className="w-5 h-5" />
                  <span>{l.clubs}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem data-tour="vol-sidebar-messages">
                <SidebarMenuButton onClick={() => handleExternalNav('/chat')} className="min-h-[48px]">
                  <MessageCircle className="w-5 h-5" />
                  <span>{l.messages}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleExternalNav('/help')} className="min-h-[48px] text-muted-foreground">
              <HelpCircle className="w-5 h-5" />
              <span>{l.help}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="min-h-[48px] text-destructive hover:text-destructive">
              <LogOut className="w-5 h-5" />
              <span>{l.logout}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default VolunteerSidebar;
