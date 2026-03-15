import { useEffect, useState } from 'react';
import { useActionCount } from '@/hooks/useActionCount';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Inbox, CalendarPlus, BarChart3, LogOut, Moon, Sun,
  Search, Grid2X2, User, Settings,
} from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';
import SidebarMoreSheet from '@/components/SidebarMoreSheet';
import { useTheme } from '@/hooks/useTheme';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const { actionCount } = useActionCount(clubId || null);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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
    { label: t3('Actielijst', 'Liste d\'actions', 'Action List'), icon: Inbox, path: '/command-center', badge: actionCount },
    { label: t3('Evenementen', 'Événements', 'Events'), icon: CalendarPlus, path: '/events-manager' },
    { label: t3('Vrijwilligers', 'Bénévoles', 'Volunteers'), icon: Users, path: '/volunteer-management', badge: pendingReviewCount },
    { label: t3('Rapporten', 'Rapports', 'Reports'), icon: BarChart3, path: '/reporting' },
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
              {/* Meer knop */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setMoreOpen(true)} className="min-h-[48px]">
                  <Grid2X2 className="w-5 h-5" />
                  <span className="flex-1">{t3('Meer', 'Plus', 'More')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <SidebarMenu>
          {/* Compact settings row */}
          {(onOpenProfile || onOpenSettings || onOpenMembers) && (
            <SidebarMenuItem>
              <div className="flex items-center gap-1 px-2 py-1">
                {onOpenProfile && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => { onOpenProfile(); setOpenMobile(false); }} className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <User className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{t3('Mijn profiel', 'Mon profil', 'My profile')}</TooltipContent>
                  </Tooltip>
                )}
                {onOpenMembers && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => { onOpenMembers(); setOpenMobile(false); }} className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <Users className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{t3('Leden', 'Membres', 'Members')}</TooltipContent>
                  </Tooltip>
                )}
                {onOpenSettings && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => { onOpenSettings(); setOpenMobile(false); }} className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <Settings className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{t3('Instellingen', 'Paramètres', 'Settings')}</TooltipContent>
                  </Tooltip>
                )}
                <div className="flex-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{theme === 'dark' ? t3('Licht thema', 'Thème clair', 'Light mode') : t3('Donker thema', 'Thème sombre', 'Dark mode')}</TooltipContent>
                </Tooltip>
              </div>
            </SidebarMenuItem>
          )}
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
