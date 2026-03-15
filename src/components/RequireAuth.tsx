import { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import PushPermissionBanner from './PushPermissionBanner';
import { syncOneSignalUser } from '@/lib/onesignal';
import { ClubProvider } from '@/contexts/ClubContext';
import AiAssistantChat from './AiAssistantChat';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import * as Sentry from '@sentry/react';
import { identifyUser, resetUser } from '@/lib/posthog';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const RequireAuth = ({ children, redirectTo = '/login' }: RequireAuthProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const initialAuthResolved = useRef(false);

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
    });
  };

  const setAuthenticated = useCallback((sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
    initialAuthResolved.current = true;
    setAuthenticatedUserId(sessionUser.id);
    setChecked(true);
    setShowRetry(false);
    // Set Sentry user context
    Sentry.setUser({ id: sessionUser.id, email: sessionUser.email || undefined });
    // Non-blocking: profile creation and push sync happen in background
    void ensureProfileExists(sessionUser).catch(e => console.warn('RequireAuth: ensureProfileExists failed', e));
    void syncOneSignalUser(sessionUser.id).catch(() => {});
  }, []);

  const retryAuth = useCallback(async () => {
    setRetrying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthenticated(session.user);
      } else {
        // Try getUser as a last resort (forces server validation)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthenticated(user);
        } else {
          setAuthenticatedUserId(null);
          setChecked(true);
          navigate(redirectTo, { replace: true });
        }
      }
    } catch {
      setAuthenticatedUserId(null);
      setChecked(true);
      navigate(redirectTo, { replace: true });
    }
    setRetrying(false);
  }, [navigate, redirectTo, setAuthenticated]);

  useEffect(() => {
    let cancelled = false;

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
        Sentry.setUser(null);
        initialAuthResolved.current = true;
        setAuthenticatedUserId(null);
        setChecked(true);
        navigate(redirectTo, { replace: true });
      }
    });

    // Imperative check — getSession reads from memory/localStorage first, fast path
    const check = async () => {
      try {
        // Fast path: check local session first
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (currentSession?.user) {
          setAuthenticated(currentSession.user);
          return;
        }

        // No local session — wait briefly for onAuthStateChange to fire (token refresh, etc.)
        // If after 5s still nothing resolved, do a server-validated fallback
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (cancelled || initialAuthResolved.current) return;

        // Fallback: server-side validation via getUser()
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          setAuthenticated(user);
          return;
        }

        // Genuinely no session
        initialAuthResolved.current = true;
        setAuthenticatedUserId(null);
        setChecked(true);
        navigate(redirectTo, { replace: true });
      } catch (e) {
        console.error('RequireAuth: unexpected error', e);
        if (!cancelled) {
          initialAuthResolved.current = true;
          setAuthenticatedUserId(null);
          setChecked(true);
          navigate(redirectTo, { replace: true });
        }
      }
    };

    void check();

    // Show retry button after 8 seconds if still loading
    const retryTimer = setTimeout(() => {
      if (!cancelled && !initialAuthResolved.current) {
        setShowRetry(true);
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      subscription.unsubscribe();
    };
  }, [navigate, redirectTo, setAuthenticated]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        {showRetry && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
            <p className="text-sm text-muted-foreground">
              {language === 'nl' ? 'Laden duurt langer dan verwacht...' : language === 'fr' ? 'Le chargement prend plus de temps que prévu...' : 'Loading is taking longer than expected...'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={retryAuth}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {language === 'nl' ? 'Opnieuw proberen' : language === 'fr' ? 'Réessayer' : 'Try again'}
            </Button>
          </div>
        )}
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
      <AiAssistantChat />
    </ClubProvider>
  );
};

export default RequireAuth;
