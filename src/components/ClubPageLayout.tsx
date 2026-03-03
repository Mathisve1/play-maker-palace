import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import ClubOwnerSidebar from '@/components/ClubOwnerSidebar';
import { Loader2 } from 'lucide-react';

interface ClubPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Reusable layout for all club sub-pages.
 * Provides auth check, club info, sidebar, and DashboardLayout wrapper.
 */
const ClubPageLayout = ({ children }: ClubPageLayoutProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<{ name: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();
      if (prof) setProfile({ full_name: prof.full_name || '', email: prof.email || '' });

      const { data: club } = await supabase
        .from('clubs')
        .select('id, name, logo_url')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (club) {
        setClubId(club.id);
        setClubInfo({ name: club.name, logo_url: club.logo_url });
      } else {
        // Check membership
        const { data: membership } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (membership?.club_id) {
          const { data: c } = await supabase
            .from('clubs')
            .select('id, name, logo_url')
            .eq('id', membership.club_id)
            .maybeSingle();
          if (c) {
            setClubId(c.id);
            setClubInfo({ name: c.name, logo_url: c.logo_url });
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
      profile={profile ? { ...profile, avatar_url: null } : null}
      clubId={clubId}
      clubInfo={clubInfo}
      onLogout={async () => { await supabase.auth.signOut(); navigate('/club-login'); }}
    />
  );

  return (
    <DashboardLayout sidebar={sidebarEl}>
      {children}
    </DashboardLayout>
  );
};

export default ClubPageLayout;
