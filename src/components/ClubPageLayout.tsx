import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<'bestuurder' | 'beheerder' | 'medewerker'>('medewerker');
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url?: string | null } | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<{ name: string; logo_url: string | null; sport?: string | null; location?: string | null } | null>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      const uid = session.user.id;
      setUserId(uid);

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', uid)
        .maybeSingle();
      if (prof) setProfile({ full_name: prof.full_name || '', email: prof.email || '', avatar_url: prof.avatar_url });

      const { data: club } = await supabase
        .from('clubs')
        .select('id, name, logo_url, sport, location')
        .eq('owner_id', uid)
        .maybeSingle();

      if (club) {
        setClubId(club.id);
        setClubInfo({ name: club.name, logo_url: club.logo_url, sport: club.sport, location: club.location });
        setIsOwner(true);
      } else {
        const { data: membership } = await supabase
          .from('club_members')
          .select('club_id, role')
          .eq('user_id', uid)
          .maybeSingle();
        if (membership?.club_id) {
          setMemberRole(membership.role as any);
          const { data: c } = await supabase
            .from('clubs')
            .select('id, name, logo_url, sport, location')
            .eq('id', membership.club_id)
            .maybeSingle();
          if (c) {
            setClubId(c.id);
            setClubInfo({ name: c.name, logo_url: c.logo_url, sport: c.sport, location: c.location });
          }
        }
      }
      setLoading(false);
    })();
  }, [navigate]);

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
      onLogout={async () => { await supabase.auth.signOut(); navigate('/club-login'); }}
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
            setProfile({ full_name: p.full_name || '', email: p.email || '', avatar_url: p.avatar_url });
          }}
        />
      )}
      {showSettings && clubId && clubInfo && (
        <ClubSettingsDialog
          clubId={clubId}
          clubInfo={{ name: clubInfo.name, sport: clubInfo.sport || null, location: clubInfo.location || null, logo_url: clubInfo.logo_url }}
          onClose={() => setShowSettings(false)}
          onUpdated={(info) => {
            setClubInfo({ ...clubInfo, ...info });
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
