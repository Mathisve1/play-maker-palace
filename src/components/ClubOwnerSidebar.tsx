import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, CreditCard, Shield, ShieldAlert,
  Ticket, Award, BarChart3, Handshake, LogOut, Settings, Banknote, MessageCircle,
  CalendarPlus, LayoutGrid, Inbox,
} from 'lucide-react';
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

  const nav = (path: string) => { navigate(path); setOpenMobile(false); };
  const isActive = (path: string) => location.pathname === path;
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  // Fetch pending action count for badge
  useEffect(() => {
    if (!clubId) return;
    const fetchCount = async () => {
      let total = 0;

      const { data: tasks } = await supabase.from('tasks').select('id, contract_template_id').eq('club_id', clubId).eq('status', 'open');
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const { count: pendingSignups } = await supabase.from('task_signups').select('id', { count: 'exact', head: true }).in('task_id', taskIds).eq('status', 'pending');
        total += pendingSignups || 0;
      }

      const { data: plans } = await supabase.from('monthly_plans').select('id').eq('club_id', clubId).eq('status', 'published');
      if (plans && plans.length > 0) {
        const planIds = plans.map(p => p.id);
        const { count: pendingEnrollments } = await supabase.from('monthly_enrollments').select('id', { count: 'exact', head: true }).in('plan_id', planIds).eq('approval_status', 'pending');
        total += pendingEnrollments || 0;

        const { data: approvedEnrollments } = await supabase.from('monthly_enrollments').select('id').in('plan_id', planIds).eq('approval_status', 'approved');
        if (approvedEnrollments && approvedEnrollments.length > 0) {
          const enrIds = approvedEnrollments.map(e => e.id);
          const { count: pendingDays } = await supabase.from('monthly_day_signups').select('id', { count: 'exact', head: true }).in('enrollment_id', enrIds).eq('status', 'pending');
          total += pendingDays || 0;
        }
      }

      setActionCount(total);
    };
    fetchCount();

    // Subscribe to realtime changes
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
    { label: 'Actielijst', icon: Inbox, path: '/command-center', badge: actionCount },
    { label: 'Evenementen & Taken', icon: CalendarPlus, path: '/events-manager' },
    { label: 'Planning', icon: LayoutGrid, path: '/planning' },
    { label: 'Safety & Security', icon: ShieldAlert, path: '/safety' },
    { label: 'Berichten', icon: MessageCircle, path: '/chat' },
  ];

  const managementItems = [
    { label: 'SEPA Vergoedingen', icon: Banknote, path: '/sepa-payouts' },
    { label: 'Contracten', icon: FileText, path: '/contract-builder' },
    { label: 'Briefings', icon: ClipboardList, path: '/briefing-builder' },
    { label: 'Compliance', icon: Shield, path: '/compliance' },
    { label: 'Ticketing', icon: Ticket, path: '/ticketing' },
    { label: 'Academy', icon: Award, path: '/academy' },
    { label: 'Loyaliteit', icon: Award, path: '/loyalty' },
    { label: 'Partners', icon: Handshake, path: '/external-partners' },
    { label: 'Rapportering', icon: BarChart3, path: '/reporting' },
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
              <p className="text-[11px] text-muted-foreground">Club Dashboard</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigatie</SidebarGroupLabel>
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
          <SidebarGroupLabel>Beheer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive(item.path)} onClick={() => nav(item.path)} className="min-h-[48px]">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(onOpenSettings || onOpenMembers) && (
          <SidebarGroup>
            <SidebarGroupLabel>Instellingen</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {onOpenMembers && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { onOpenMembers(); setOpenMobile(false); }} className="min-h-[48px]">
                      <Users className="w-5 h-5" />
                      <span>Leden</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {onOpenSettings && (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { onOpenSettings(); setOpenMobile(false); }} className="min-h-[48px]">
                      <Settings className="w-5 h-5" />
                      <span>Instellingen</span>
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
            <SidebarMenuButton onClick={onLogout} className="min-h-[48px] text-destructive hover:text-destructive">
              <LogOut className="w-5 h-5" />
              <span>Uitloggen</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ClubOwnerSidebar;
