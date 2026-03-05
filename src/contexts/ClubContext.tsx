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

  const load = useCallback(async () => {
    // Parallel: profile + owned clubs + memberships
    const [profileRes, ownedRes, membershipRes] = await Promise.all([
      supabase.from('profiles').select('full_name, email, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('clubs').select('id, name, logo_url, sport, location').eq('owner_id', userId).limit(1),
      supabase.from('club_members').select('club_id, role').eq('user_id', userId).limit(1),
    ]);

    if (profileRes.data) {
      setProfile({
        full_name: profileRes.data.full_name || '',
        email: profileRes.data.email || '',
        avatar_url: profileRes.data.avatar_url,
      });
    }

    const ownedClub = ownedRes.data?.[0];
    if (ownedClub) {
      setClubId(ownedClub.id);
      setClubInfo(ownedClub);
      setIsOwner(true);
    } else if (membershipRes.data?.club_id) {
      setMemberRole((membershipRes.data.role as any) || 'medewerker');
      // Need to fetch club info
      const { data: c } = await supabase
        .from('clubs')
        .select('id, name, logo_url, sport, location')
        .eq('id', membershipRes.data.club_id)
        .maybeSingle();
      if (c) {
        setClubId(c.id);
        setClubInfo(c);
      }
    }

    setLoading(false);
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
      refresh: load,
      updateProfile,
      updateClubInfo,
    }}>
      {children}
    </ClubContext.Provider>
  );
};
