import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClubInfo {
  id: string;
  name: string;
  logo_url: string | null;
  sport?: string | null;
  location?: string | null;
}

interface ProfileInfo {
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface ClubContextValue {
  userId: string | null;
  clubId: string | null;
  clubInfo: ClubInfo | null;
  profile: ProfileInfo | null;
  isOwner: boolean;
  memberRole: 'bestuurder' | 'beheerder' | 'medewerker';
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (p: Partial<ProfileInfo>) => void;
  updateClubInfo: (c: Partial<ClubInfo>) => void;
}

const ClubContext = createContext<ClubContextValue | null>(null);

export const useClubContext = () => {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClubContext must be used within ClubProvider');
  return ctx;
};

/**
 * Optionally use club context — returns null if not inside a ClubProvider.
 * Useful for components that may be used outside club pages.
 */
export const useOptionalClubContext = () => useContext(ClubContext);

export const ClubProvider = ({ children, authenticatedUserId }: { children: React.ReactNode; authenticatedUserId: string }) => {
  const [userId] = useState(authenticatedUserId);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<'bestuurder' | 'beheerder' | 'medewerker'>('medewerker');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setClubId(null);
    setClubInfo(null);
    setProfile(null);
    setIsOwner(false);
    setMemberRole('medewerker');

    try {
      // Parallel: profile + owned clubs + club_memberships (new table)
      const [profileRes, ownedRes, membershipRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email, avatar_url, primary_club_id').eq('id', userId).maybeSingle(),
        supabase.from('clubs').select('id, name, logo_url, sport, location').eq('owner_id', userId).limit(1),
        supabase.from('club_memberships').select('club_id, club_role, status').eq('volunteer_id', userId).eq('status', 'actief'),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (ownedRes.error) throw ownedRes.error;
      if (membershipRes.error) throw membershipRes.error;

      const profileData = profileRes.data as any;
      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          avatar_url: profileData.avatar_url,
        });
      }

      const ownedClub = ownedRes.data?.[0];
      const memberships = (membershipRes.data || []) as any[];
      const primaryClubId = profileData?.primary_club_id;

      if (ownedClub) {
        setClubId(ownedClub.id);
        setClubInfo(ownedClub);
        setIsOwner(true);
      } else if (memberships.length > 0) {
        // Prefer the primary_club_id if it matches an active membership, otherwise first
        const target = memberships.find((m: any) => m.club_id === primaryClubId) || memberships[0];
        setMemberRole((target.club_role as any) || 'medewerker');

        const { data: c, error: clubError } = await supabase
          .from('clubs')
          .select('id, name, logo_url, sport, location')
          .eq('id', target.club_id)
          .maybeSingle();

        if (clubError) throw clubError;

        if (c) {
          setClubId(c.id);
          setClubInfo(c);
        }
      }
    } catch (err) {
      console.error('ClubContext load failed', err);
      setError('club-context-load-failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback((p: Partial<ProfileInfo>) => {
    setProfile(prev => prev ? { ...prev, ...p } : null);
  }, []);

  const updateClubInfo = useCallback((c: Partial<ClubInfo>) => {
    setClubInfo(prev => prev ? { ...prev, ...c } : null);
  }, []);

  return (
    <ClubContext.Provider value={{
      userId,
      clubId,
      clubInfo,
      profile,
      isOwner,
      memberRole,
      loading,
      error,
      refresh: load,
      updateProfile,
      updateClubInfo,
    }}>
      {children}
    </ClubContext.Provider>
  );
};
