import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, LogOut, Settings, UserCheck,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageContext';

interface PartnerSidebarProps {
  partnerName: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  tasksBadge?: number;
}

const PartnerSidebar = ({ partnerName, activeTab, setActiveTab, onLogout, onOpenProfile, tasksBadge }: PartnerSidebarProps) => {
  const { setOpenMobile } = useSidebar();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="p-4 pb-2">
        <div className="hidden md:block">
          <Logo size="sm" linkTo="/partner-dashboard" />
        </div>
        <div className="mt-3 p-2 -mx-2 rounded-xl">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{partnerName}</p>
          <p className="text-[11px] text-muted-foreground">Partner Dashboard</p>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'dashboard'} onClick={() => handleNav('dashboard')} className="min-h-[48px]">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'tasks'} onClick={() => handleNav('tasks')} className="min-h-[48px]">
                  <ClipboardList className="w-5 h-5" />
                  <span>{t3('Taken', 'Tâches', 'Tasks')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'attendance'} onClick={() => handleNav('attendance')} className="min-h-[48px]">
                  <UserCheck className="w-5 h-5" />
                  <span>{t3('Aanwezigheid', 'Présences', 'Attendance')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeTab === 'members'} onClick={() => handleNav('members')} className="min-h-[48px]">
                  <Users className="w-5 h-5" />
                  <span>{t3('Medewerkers', 'Collaborateurs', 'Staff')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t3('Instellingen', 'Paramètres', 'Settings')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => { onOpenProfile(); setOpenMobile(false); }} className="min-h-[48px]">
                  <Settings className="w-5 h-5" />
                  <span>{t3('Profiel & meldingen', 'Profil & notifications', 'Profile & notifications')}</span>
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

export default PartnerSidebar;
