import React from 'react';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Logo from '@/components/Logo';
import BottomTabBar from '@/components/BottomTabBar';
import NotificationBell from '@/components/NotificationBell';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  userId?: string;
  /** Volunteer mode: locks viewport to 100dvh, hides mobile sidebar trigger, scrolls only the main area */
  volunteerMode?: boolean;
}

const DashboardLayout = ({ sidebar, children, userId, volunteerMode }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div
        className={cn(
          'flex w-full bg-background',
          volunteerMode ? 'h-[100dvh] overflow-hidden' : 'min-h-screen',
        )}
      >
        {sidebar}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header — hidden on md+ (sidebar is always visible there) */}
          <header
            className="min-h-[60px] flex items-center gap-3 border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40 px-4 pt-[env(safe-area-inset-top)] md:hidden"
          >
            {/* Hide sidebar trigger in volunteer mode — bottom nav handles navigation */}
            {!volunteerMode && <SidebarTrigger />}
            <Logo size="sm" linkTo="/dashboard" />
            <div className="ml-auto">
              {userId && <NotificationBell userId={userId} />}
            </div>
          </header>

          <main
            className={cn(
              'flex-1 p-4 md:p-6 lg:p-8 md:pb-6 lg:pb-8',
              volunteerMode ? 'overflow-y-auto' : 'overflow-auto',
            )}
            style={{
              paddingBottom:
                'calc(72px + env(safe-area-inset-bottom, 0px) + 16px)',
            }}
          >
            {children}
          </main>

          <BottomTabBar />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
