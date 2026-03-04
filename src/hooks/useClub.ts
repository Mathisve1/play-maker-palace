import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ClubInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

interface UseClubResult {
  userId: string | null;
  clubId: string | null;
  clubInfo: ClubInfo | null;
  profile: { full_name: string | null; email: string | null } | null;
  loading: boolean;
}

/**
 * Centralized hook to find the current user's club.
 * Checks owned clubs first, then memberships.
 * Redirects to login if no session.
 */
export const useClub = (redirectOnNoSession = true): UseClubResult => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (redirectOnNoSession) navigate('/login');
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setUserId(session.user.id);

      // Parallel: profile + owned clubs
      const [profileRes, ownedRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', session.user.id).maybeSingle(),
        supabase.from('clubs').select('id, name, logo_url').eq('owner_id', session.user.id).limit(1),
      ]);

      if (cancelled) return;
      setProfile(profileRes.data);

      let club = ownedRes.data?.[0] || null;
      if (!club) {
        const { data: memberships } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', session.user.id)
          .limit(1);
        if (memberships?.[0]) {
          const { data: c } = await supabase
            .from('clubs')
            .select('id, name, logo_url')
            .eq('id', memberships[0].club_id)
            .maybeSingle();
          club = c;
        }
      }

      if (cancelled) return;
      if (club) {
        setClubId(club.id);
        setClubInfo(club);
      }
      setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, [navigate, redirectOnNoSession]);

  return { userId, clubId, clubInfo, profile, loading };
};
