import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Logo from '@/components/Logo';

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
          {/* Safe area spacer for PWA notch/statusbar */}
          <div className="bg-card/90 backdrop-blur-xl md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }} />
          {/* Mobile header with hamburger trigger */}
          <header
            className="min-h-14 flex items-center gap-3 border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40 px-4 md:hidden"
          >
            <SidebarTrigger />
            <Logo size="sm" linkTo="/dashboard" />
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
