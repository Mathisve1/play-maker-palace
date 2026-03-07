import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import PushPermissionBanner from './PushPermissionBanner';
import { syncOneSignalUser } from '@/lib/onesignal';
import { ClubProvider } from '@/contexts/ClubContext';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const RequireAuth = ({ children, redirectTo = '/login' }: RequireAuthProps) => {
  const navigate = useNavigate();
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const ensureProfileExists = async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profile) return;

    await supabase.from('profiles').insert({
      id: sessionUser.id,
      email: sessionUser.email || null,
      full_name: (sessionUser.user_metadata?.full_name as string) || null,
    } as any);
  };

  useEffect(() => {
    let cancelled = false;

    const setAuthenticated = (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
      if (cancelled) return;
      setAuthenticatedUserId(sessionUser.id);
      setChecked(true);
      // Non-blocking: profile creation and push sync happen in background
      void ensureProfileExists(sessionUser).catch(e => console.warn('RequireAuth: ensureProfileExists failed', e));
      void syncOneSignalUser(sessionUser.id).catch(() => {});
    };

    // FAST PATH: Try synchronous cached session first (avoids network round-trip)
    const cachedSession = (supabase.auth as any)?.currentSession;
    if (cachedSession?.user) {
      setAuthenticated(cachedSession.user);
    }

    // Set up the listener FIRST so it catches any auth events during init
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (session?.user) {
        setAuthenticated(session.user);
        return;
      }

      // Only redirect on explicit sign-out, never on transient null sessions
      if (event === 'SIGNED_OUT') {
        if (cancelled) return;
        setAuthenticatedUserId(null);
        setChecked(true);
        navigate(redirectTo, { replace: true });
      }
    });

    // Then do the imperative check (if not already resolved by cache)
    if (!cachedSession?.user) {
      const check = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (cancelled) return;

          if (session?.user) {
            setAuthenticated(session.user);
            return;
          }

          // Genuinely no session
          if (cancelled) return;
          setAuthenticatedUserId(null);
          setChecked(true);
          navigate(redirectTo, { replace: true });
        } catch (e) {
          console.error('RequireAuth: unexpected error', e);
          if (!cancelled) {
            setAuthenticatedUserId(null);
            setChecked(true);
            navigate(redirectTo, { replace: true });
          }
        }
      };

      void check();
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, redirectTo]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticatedUserId) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <ClubProvider authenticatedUserId={authenticatedUserId}>
      <PushPermissionBanner />
      {children}
    </ClubProvider>
  );
};

export default RequireAuth;
