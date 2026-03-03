import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, ClipboardList, MessageCircle, Users,
  CreditCard, FileSignature, Ticket, Gift, Award, LogOut, Settings,
  HelpCircle, Building2, Shield, CalendarDays,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { Language } from '@/i18n/translations';

export type VolunteerTab = 'dashboard' | 'all' | 'mine' | 'monthly' | 'payments' | 'contracts' | 'briefings' | 'loyalty' | 'tickets' | 'academy' | 'partner' | 'safety';

interface VolunteerSidebarProps {
  activeTab: VolunteerTab;
  setActiveTab: (tab: VolunteerTab) => void;
  profile: { full_name: string; email: string; avatar_url?: string | null } | null;
  language: Language;
  onLogout: () => void;
  onOpenProfile: () => void;
  counts?: {
    pending?: number;
    assigned?: number;
    payments?: number;
    contracts?: number;
    tickets?: number;
    loyalty?: number;
    safety?: number;
  };
}

const labels: Record<Language, Record<string, string>> = {
  nl: {
    dashboard: 'Dashboard',
    allTasks: 'Alle Taken',
    myTasks: 'Mijn Taken',
    monthly: 'Maandplanning',
    messages: 'Berichten',
    clubSearch: 'Club Zoeken',
    payments: 'Vergoedingen',
    contracts: 'Contracten',
    briefings: 'Briefings',
    tickets: 'Tickets',
    academy: 'Academy',
    loyalty: 'Loyaliteit',
    safety: 'Veiligheidscontrole',
    settings: 'Instellingen',
    help: 'Hulp nodig?',
    logout: 'Uitloggen',
    overview: 'Overzicht',
    communication: 'Communicatie',
    manage: 'Beheer',
  },
  fr: {
    dashboard: 'Tableau de bord',
    allTasks: 'Toutes les tâches',
    myTasks: 'Mes tâches',
    monthly: 'Planning mensuel',
    messages: 'Messages',
    clubSearch: 'Chercher un club',
    payments: 'Remboursements',
    contracts: 'Contrats',
    briefings: 'Briefings',
    tickets: 'Tickets',
    academy: 'Académie',
    loyalty: 'Fidélité',
    safety: 'Contrôle de sécurité',
    settings: 'Paramètres',
    help: 'Besoin d\'aide?',
    logout: 'Déconnexion',
    overview: 'Aperçu',
    communication: 'Communication',
    manage: 'Gestion',
  },
  en: {
    dashboard: 'Dashboard',
    allTasks: 'All Tasks',
    myTasks: 'My Tasks',
    monthly: 'Monthly Planning',
    messages: 'Messages',
    clubSearch: 'Find Clubs',
    payments: 'Payments',
    contracts: 'Contracts',
    briefings: 'Briefings',
    tickets: 'Tickets',
    academy: 'Academy',
    loyalty: 'Loyalty',
    safety: 'Safety Check',
    settings: 'Settings',
    help: 'Need help?',
    logout: 'Log out',
    overview: 'Overview',
    communication: 'Communication',
    manage: 'Manage',
  },
};

const VolunteerSidebar = ({
  activeTab, setActiveTab, profile, language, onLogout, onOpenProfile, counts = {},
}: VolunteerSidebarProps) => {
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const l = labels[language];

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
        <div className="hidden md:block">
          <Logo size="sm" linkTo="/dashboard" />
        </div>
        <button
          onClick={onOpenProfile}
          className="mt-3 flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-sidebar-accent transition-colors w-full text-left min-h-[48px]"
        >
          <Avatar className="h-9 w-9 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />}
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile?.full_name || profile?.email || ''}</p>
            <p className="text-[11px] text-muted-foreground truncate">{l.settings}</p>
          </div>
        </button>
      </SidebarHeader>

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
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'all'} onClick={() => handleNav('all')} className="min-h-[48px]">
                  <Search className="w-5 h-5" />
                  <span>{l.allTasks}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'mine'} onClick={() => handleNav('mine')} className="min-h-[48px]">
                  <ClipboardList className="w-5 h-5" />
                  <span>{l.myTasks}</span>
                  <Badge count={(counts.pending || 0) + (counts.assigned || 0)} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'monthly'} onClick={() => handleNav('monthly')} className="min-h-[48px]">
                  <CalendarDays className="w-5 h-5" />
                  <span>{l.monthly}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'safety'} onClick={() => handleNav('safety')} className="min-h-[48px]">
                  <Shield className="w-5 h-5" />
                  <span>{l.safety}</span>
                  <Badge count={counts.safety} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Communication group */}
        <SidebarGroup>
          <SidebarGroupLabel>{l.communication}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleExternalNav('/chat')} className="min-h-[48px]">
                  <MessageCircle className="w-5 h-5" />
                  <span>{l.messages}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleExternalNav('/community')} className="min-h-[48px]">
                  <Users className="w-5 h-5" />
                  <span>{l.clubSearch}</span>
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
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'payments'} onClick={() => handleNav('payments')} className="min-h-[48px]">
                  <CreditCard className="w-5 h-5" />
                  <span>{l.payments}</span>
                  <Badge count={counts.payments} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'contracts'} onClick={() => handleNav('contracts')} className="min-h-[48px]">
                  <FileSignature className="w-5 h-5" />
                  <span>{l.contracts}</span>
                  <Badge count={counts.contracts} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'briefings'} onClick={() => handleNav('briefings')} className="min-h-[48px]">
                  <ClipboardList className="w-5 h-5" />
                  <span>{l.briefings}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'tickets'} onClick={() => handleNav('tickets')} className="min-h-[48px]">
                  <Ticket className="w-5 h-5" />
                  <span>{l.tickets}</span>
                  <Badge count={counts.tickets} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'academy'} onClick={() => handleNav('academy')} className="min-h-[48px]">
                  <Award className="w-5 h-5" />
                  <span>{l.academy}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'loyalty'} onClick={() => handleNav('loyalty')} className="min-h-[48px]">
                  <Gift className="w-5 h-5" />
                  <span>{l.loyalty}</span>
                  <Badge count={counts.loyalty} />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'partner'} onClick={() => handleNav('partner')} className="min-h-[48px]">
                  <Building2 className="w-5 h-5" />
                  <span>{language === 'nl' ? 'Partner' : language === 'fr' ? 'Partenaire' : 'Partner'}</span>
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
            <SidebarMenuButton onClick={() => handleExternalNav('https://docs.lovable.dev')} className="min-h-[48px] text-muted-foreground">
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
