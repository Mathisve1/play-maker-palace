import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, CreditCard, Shield, ShieldAlert,
  Ticket, Award, BarChart3, Handshake, LogOut, Settings, Banknote, MessageCircle,
  CalendarPlus, LayoutGrid, Inbox, User, TrendingUp, Moon, Sun, Bell, Search,
  ScrollText,
} from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';
import { useTheme } from '@/hooks/useTheme';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface ClubOwnerSidebarProps {
  profile: { full_name: string; email: string; avatar_url?: string | null } | null;
  clubId?: string | null;
  clubInfo?: { name: string; logo_url: string | null } | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenMembers?: () => void;
}

const ClubOwnerSidebar = ({
  profile, clubId, clubInfo, onLogout, onOpenProfile, onOpenSettings, onOpenMembers,
}: ClubOwnerSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const { language } = useLanguage();
  const [actionCount, setActionCount] = useState(0);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const nav = (path: string) => { navigate(path); setOpenMobile(false); };
  const isActive = (path: string) => location.pathname === path;
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  useEffect(() => {
    if (!clubId) return;
    const fetchCount = async () => {
      let total = 0;

      const [tasksRes, plansRes] = await Promise.all([
        supabase.from('tasks').select('id, contract_template_id').eq('club_id', clubId).eq('status', 'open'),
        supabase.from('monthly_plans').select('id, contract_template_id').eq('club_id', clubId).eq('status', 'published'),
      ]);

      const tasks = tasksRes.data;
      const plans = plansRes.data;

      // Task signups (pending) + contracts (assigned with template)
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const { data: signups } = await supabase.from('task_signups').select('id, task_id, status').in('task_id', taskIds).in('status', ['pending', 'assigned']);
        const tasksWithContract = new Set(tasks.filter(t => t.contract_template_id).map(t => t.id));
        (signups || []).forEach(s => {
          if (s.status === 'pending') total++;
          if (s.status === 'assigned' && tasksWithContract.has(s.task_id)) total++;
        });
      }

      // Monthly: enrollments (pending) + contracts (approved+pending contract) + day signups (pending) + tickets (assigned without barcode)
      if (plans && plans.length > 0) {
        const planIds = plans.map(p => p.id);
        const { data: enrollments } = await supabase.from('monthly_enrollments').select('id, plan_id, approval_status, contract_status').in('plan_id', planIds);
        const enrs = enrollments || [];
        const plansWithContract = new Set(plans.filter(p => p.contract_template_id).map(p => p.id));

        enrs.forEach(e => {
          if (e.approval_status === 'pending') total++;
          if (e.approval_status === 'approved' && e.contract_status === 'pending' && plansWithContract.has(e.plan_id)) total++;
        });

        if (enrs.length > 0) {
          const enrIds = enrs.map(e => e.id);
          const { data: daySignups } = await supabase.from('monthly_day_signups').select('id, status, ticket_barcode').in('enrollment_id', enrIds);
          (daySignups || []).forEach(ds => {
            if (ds.status === 'pending') total++;
            if (ds.status === 'assigned' && !ds.ticket_barcode) total++;
          });
        }
      }

      setActionCount(total);

      // Pending reviews: completed signups for club's tasks without a club review
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
    fetchCount();

    const channel = supabase
      .channel('sidebar-action-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_signups' }, fetchCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_enrollments' }, fetchCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_day_signups' }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  const mainItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/club-dashboard' },
    { label: t3('Actielijst', 'Liste d\'actions', 'Action List'), icon: Inbox, path: '/command-center', badge: actionCount },
    { label: t3('Evenementen & Taken', 'Événements & Tâches', 'Events & Tasks'), icon: CalendarPlus, path: '/events-manager' },
    { label: 'Planning', icon: LayoutGrid, path: '/planning' },
    { label: t3('Safety & Security', 'Sécurité', 'Safety & Security'), icon: ShieldAlert, path: '/safety' },
    { label: t3('Berichten', 'Messages', 'Messages'), icon: MessageCircle, path: '/chat' },
    { label: t3('Notificaties', 'Notifications', 'Notifications'), icon: Bell, path: '/notifications' },
  ];

  const managementItems = [
    { label: t3('Vrijwilligers', 'Bénévoles', 'Volunteers'), icon: Users, path: '/volunteer-management', badge: pendingReviewCount },
    { label: t3('SEPA Vergoedingen', 'Indemnités SEPA', 'SEPA Payments'), icon: Banknote, path: '/sepa-payouts' },
    { label: t3('Contracten', 'Contrats', 'Contracts'), icon: FileText, path: '/contract-builder' },
    { label: 'Briefings', icon: ClipboardList, path: '/briefing-builder' },
    { label: 'Compliance', icon: Shield, path: '/compliance' },
    { label: 'Ticketing', icon: Ticket, path: '/ticketing' },
    { label: t3('Academie', 'Académie', 'Academy'), icon: Award, path: '/academy' },
    { label: t3('Loyaliteit', 'Fidélité', 'Loyalty'), icon: Award, path: '/loyalty' },
    { label: t3('Partners', 'Partenaires', 'Partners'), icon: Handshake, path: '/external-partners' },
    { label: t3('Rapportering', 'Rapports', 'Reporting'), icon: BarChart3, path: '/reporting' },
    { label: t3('Analytics', 'Analytique', 'Analytics'), icon: TrendingUp, path: '/analytics' },
  ];

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="p-4 pb-2">
        <div className="hidden md:block">
          <Logo size="sm" linkTo="/club-dashboard" />
        </div>
        {clubInfo && (
          <div className="mt-3 flex items-center gap-3 p-2 -mx-2 rounded-xl">
            <Avatar className="h-9 w-9 shrink-0">
              {clubInfo.logo_url && <AvatarImage src={clubInfo.logo_url} alt={clubInfo.name} />}
              <AvatarFallback className="text-xs font-bold bg-secondary/10 text-secondary">{clubInfo.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{clubInfo.name}</p>
              <p className="text-[11px] text-muted-foreground">{t3('Club Dashboard', 'Tableau de bord club', 'Club Dashboard')}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setSearchOpen(true)}
          className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground text-xs hover:bg-muted transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{t3('Zoeken...', 'Rechercher...', 'Search...')}</span>
          <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </button>
      </SidebarHeader>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} clubId={clubId} isClubOwner={true} />

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t3('Navigatie', 'Navigation', 'Navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive(item.path)} onClick={() => nav(item.path)} className="min-h-[48px]">
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && (item as any).badge > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center ml-auto">
                        {(item as any).badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t3('Beheer', 'Gestion', 'Management')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive(item.path)} onClick={() => nav(item.path)} className="min-h-[48px]">
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && (item as any).badge > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center ml-auto">
                        {(item as any).badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(onOpenProfile || onOpenSettings || onOpenMembers) && (
          <SidebarGroup>
            <SidebarGroupLabel>{t3('Instellingen', 'Paramètres', 'Settings')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {onOpenProfile && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { onOpenProfile(); setOpenMobile(false); }} className="min-h-[48px]">
                      <User className="w-5 h-5" />
                      <span>{t3('Mijn profiel', 'Mon profil', 'My profile')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {onOpenMembers && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { onOpenMembers(); setOpenMobile(false); }} className="min-h-[48px]">
                      <Users className="w-5 h-5" />
                      <span>{t3('Leden', 'Membres', 'Members')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {onOpenSettings && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { onOpenSettings(); setOpenMobile(false); }} className="min-h-[48px]">
                      <Settings className="w-5 h-5" />
                      <span>{t3('Instellingen', 'Paramètres', 'Settings')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} className="min-h-[48px] text-muted-foreground">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span>{theme === 'dark' ? t3('Licht thema', 'Thème clair', 'Light mode') : t3('Donker thema', 'Thème sombre', 'Dark mode')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="min-h-[48px] text-destructive hover:text-destructive">
              <LogOut className="w-5 h-5" />
              <span>{t3('Uitloggen', 'Déconnexion', 'Log out')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ClubOwnerSidebar;
