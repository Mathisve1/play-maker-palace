import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PublicSidebar from '@/components/PublicSidebar';

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

const PublicPageLayout = ({ children }: PublicPageLayoutProps) => {
  return (
    <DashboardLayout sidebar={<PublicSidebar />}>
      {children}
    </DashboardLayout>
  );
};

export default PublicPageLayout;
