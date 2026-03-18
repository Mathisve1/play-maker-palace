import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Logo from '@/components/Logo';
import BottomTabBar from '@/components/BottomTabBar';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout = ({ sidebar, children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {sidebar}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header with safe-area for PWA notch/statusbar */}
          <header
            className="min-h-14 flex items-center gap-3 border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40 px-4 pt-[env(safe-area-inset-top)] md:hidden"
          >
            <SidebarTrigger />
            <Logo size="sm" linkTo="/dashboard" />
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto pb-[68px] md:pb-6 lg:pb-8">
            {children}
          </main>
          <BottomTabBar />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
