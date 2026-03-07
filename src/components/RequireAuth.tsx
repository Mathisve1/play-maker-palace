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
    let initialAuthResolved = false;

    const setAuthenticated = async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
      await ensureProfileExists(sessionUser);
      if (cancelled) return;

      setAuthenticatedUserId(sessionUser.id);
      setChecked(true);
      void syncOneSignalUser(sessionUser.id).catch((error) => {
        console.error('OneSignal sync failed:', error);
      });
    };

    const setUnauthenticated = () => {
      if (cancelled) return;
      setAuthenticatedUserId(null);
      setChecked(true);
      navigate(redirectTo, { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (session?.user) {
        await setAuthenticated(session.user);
        return;
      }

      // Ignore transient null sessions during bootstrap; only react to real sign-outs after init.
      if (!initialAuthResolved) return;
      if (event === 'SIGNED_OUT') {
        setUnauthenticated();
      }
    });

    const check = async () => {
      try {
        let session: any = null;

        try {
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 10000)
            ),
          ]);
          session = (sessionResult as any)?.data?.session ?? null;
        } catch {
          console.warn('RequireAuth: getSession timed out, trying getUser fallback...');
        }

        if (cancelled) return;

        if (session?.user) {
          await setAuthenticated(session.user);
          return;
        }

        try {
          const userResult = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 10000)
            ),
          ]);

          const user = (userResult as any)?.data?.user ?? null;
          if (cancelled) return;

          if (user) {
            await setAuthenticated(user);
            return;
          }
        } catch {
          console.warn('RequireAuth: getUser timed out, waiting for auth state change...');
          return;
        }

        if (cancelled) return;
        setUnauthenticated();
      } finally {
        initialAuthResolved = true;
      }
    };

    void check();

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
