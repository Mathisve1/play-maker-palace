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

    const check = async () => {
      try {
        // Try getSession with generous timeout; on timeout, wait for onAuthStateChange instead
        let session: any = null;
        try {
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 8000)
            ),
          ]);
          session = (sessionResult as any)?.data?.session ?? null;
        } catch {
          // Timeout — don't redirect yet, let onAuthStateChange handle it
          console.warn('RequireAuth: getSession timed out, waiting for auth state change...');
          return;
        }

        if (cancelled) return;

        if (!session) {
          // Double-check with getUser as fallback before redirecting
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && !cancelled) {
              await ensureProfileExists(user);
              setAuthenticatedUserId(user.id);
              setChecked(true);
              return;
            }
          } catch {}

          if (cancelled) return;
          setAuthenticatedUserId(null);
          navigate(redirectTo, { replace: true });
          return;
        }

        await ensureProfileExists(session.user);
        if (cancelled) return;

        setAuthenticatedUserId(session.user.id);
        // Fire-and-forget OneSignal sync
        void syncOneSignalUser(session.user.id).catch((error) => {
          console.error('OneSignal sync failed:', error);
        });
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session && !cancelled) {
        navigate(redirectTo, { replace: true });
        return;
      }

      if (session && !cancelled) {
        await ensureProfileExists(session.user);
        setAuthenticatedUserId(session.user.id);
        setChecked(true);
        void syncOneSignalUser(session.user.id).catch((error) => {
          console.error('OneSignal sync failed:', error);
        });
      }
    });

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
