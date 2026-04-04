import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import DashboardLayout from '@/components/DashboardLayout';
import ClubOwnerSidebar from '@/components/ClubOwnerSidebar';
import EditProfileDialog from '@/components/EditProfileDialog';
import ClubSettingsDialog from '@/components/ClubSettingsDialog';
import ClubMembersDialog from '@/components/ClubMembersDialog';
import { Loader2 } from 'lucide-react';

interface ClubPageLayoutProps {
  children: React.ReactNode;
}

const ClubPageLayout = ({ children }: ClubPageLayoutProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { userId, clubId, clubInfo, profile, isOwner, memberRole, loading, updateProfile, updateClubInfo } = useClubContext();

  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sidebarEl = (
    <ClubOwnerSidebar
      profile={profile}
      clubId={clubId}
      clubInfo={clubInfo}
      onLogout={async () => { await supabase.auth.signOut(); window.location.href = '/club-login'; }}
      onOpenProfile={() => setShowProfile(true)}
      onOpenSettings={() => setShowSettings(true)}
      onOpenMembers={() => setShowMembers(true)}
    />
  );

  return (
    <DashboardLayout sidebar={sidebarEl}>
      {children}

      {showProfile && userId && (
        <EditProfileDialog
          open={showProfile}
          onOpenChange={setShowProfile}
          userId={userId}
          language={language}
          onProfileUpdated={(p) => {
            updateProfile({ full_name: p.full_name || '', email: p.email || '', avatar_url: p.avatar_url });
          }}
        />
      )}
      {showSettings && clubId && clubInfo && (
        <ClubSettingsDialog
          clubId={clubId}
          clubInfo={{ name: clubInfo.name, sport: clubInfo.sport || null, location: clubInfo.location || null, logo_url: clubInfo.logo_url }}
          onClose={() => setShowSettings(false)}
          onUpdated={(info) => {
            updateClubInfo(info);
            setShowSettings(false);
          }}
        />
      )}
      {showMembers && clubId && userId && (
        <ClubMembersDialog
          clubId={clubId}
          currentUserId={userId}
          isOwner={isOwner}
          currentUserRole={memberRole}
          onClose={() => setShowMembers(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default ClubPageLayout;
