import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'e0d35921-dd83-4e98-a289-f9d1bb1694cc';

let oneSignalInitPromise: Promise<void> | null = null;
let oneSignalInitialized = false;

async function getOneSignalModule() {
  return import('react-onesignal').then(m => m.default).catch((err) => {
    console.error('[OneSignal] Failed to load SDK module:', err);
    return null;
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCurrentSubscriptionId(OneSignalModule: any): Promise<string | null> {
  try {
    const directId = OneSignalModule?.User?.PushSubscription?.id;
    if (directId) {
      console.log('[OneSignal] Got subscription ID (direct):', directId);
      return directId;
    }

    const asyncId = await OneSignalModule?.User?.PushSubscription?.getIdAsync?.().catch(() => null);
    if (asyncId) {
      console.log('[OneSignal] Got subscription ID (async):', asyncId);
      return asyncId;
    }

    // Try token as fallback
    const token = OneSignalModule?.User?.PushSubscription?.token;
    if (token) {
      console.log('[OneSignal] Got subscription token:', token);
      return token;
    }
  } catch (err) {
    console.error('[OneSignal] Error getting subscription ID:', err);
  }
  return null;
}

async function getSubscriptionIdWithRetry(OneSignalModule: any, retries = 10, delayMs = 500): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    const id = await getCurrentSubscriptionId(OneSignalModule);
    if (id) return id;
    // Bail out early if permission is denied — no point retrying
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unknown';
    if (permission === 'denied') {
      console.log('[OneSignal] Permission denied, stopping retries');
      return null;
    }
    if (i % 5 === 0) {
      const optedIn = OneSignalModule?.User?.PushSubscription?.optedIn;
      console.log(`[OneSignal] Retry ${i}/${retries} - optedIn: ${optedIn}, permission: ${permission}`);
    }
    await wait(delayMs);
  }
  console.warn('[OneSignal] Failed to get subscription ID after retries');
  return null;
}

async function attachOneSignalUser(OneSignalModule: any, userId: string) {
  try {
    console.log('[OneSignal] Attaching user:', userId);
    await OneSignalModule?.login?.(userId).catch((e: any) => console.warn('[OneSignal] login() error:', e));
    await OneSignalModule?.User?.addAlias?.('external_id', userId).catch((e: any) => console.warn('[OneSignal] addAlias() error:', e));
  } catch (err) {
    console.error('[OneSignal] attachOneSignalUser failed:', err);
  }
}

export async function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] App ID not configured');
    return;
  }

  if (oneSignalInitialized) return;
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    const OneSignalModule = await getOneSignalModule();
    if (!OneSignalModule) {
      console.warn('[OneSignal] SDK not available');
      return;
    }

    try {
      console.log('[OneSignal] Initializing with App ID:', ONESIGNAL_APP_ID);
      console.log('[OneSignal] Current origin:', window.location.origin);

      await OneSignalModule.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: 'web.onesignal.auto.69a0d04c-4cfa-4f80-8d34-652264ce8748',
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/push/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/push/OneSignalSDKUpdaterWorker.js',
        serviceWorkerParam: { scope: '/push/' },
        notifyButton: { enable: false },
        promptOptions: {
          autoPrompt: false,
        },
      });

      oneSignalInitialized = true;
      console.log('[OneSignal] ✅ Initialized successfully');

      // Log current state
      const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
      const optedIn = OneSignalModule?.User?.PushSubscription?.optedIn;
      console.log(`[OneSignal] Permission: ${permission}, OptedIn: ${optedIn}`);

      // Set default URL for notification clicks (PWA)
      if (OneSignalModule.Notifications?.setDefaultUrl) {
        OneSignalModule.Notifications.setDefaultUrl('https://play-maker-palace.lovable.app');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await attachOneSignalUser(OneSignalModule, user.id);
      } else {
        console.log('[OneSignal] No authenticated user yet');
      }

      OneSignalModule.User.PushSubscription.addEventListener('change', async (event: any) => {
        console.log('[OneSignal] 🔔 PushSubscription changed:', JSON.stringify(event?.current || event));
        let playerId = event?.current?.id || event?.current?.subscriptionId || event?.current?.token;
        if (!playerId) {
          playerId = await getCurrentSubscriptionId(OneSignalModule);
        }
        if (playerId) {
          console.log('[OneSignal] Linking player ID from change event:', playerId);
          await linkPlayerIdToProfile(playerId);
        } else {
          console.warn('[OneSignal] Change event but no player ID found');
        }
      });

      const currentId = await getSubscriptionIdWithRetry(OneSignalModule, 30, 500);
      if (currentId) {
        await linkPlayerIdToProfile(currentId);
      } else {
        console.warn('[OneSignal] No subscription ID available after init');
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Init error:', error);
    }
  })();

  return oneSignalInitPromise;
}

export async function syncOneSignalUser(userIdOverride?: string) {
  if (!ONESIGNAL_APP_ID) return;
  await initOneSignal();

  const OneSignalModule = await getOneSignalModule();
  if (!OneSignalModule) return;

  const userId = userIdOverride || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return;

  console.log('[OneSignal] Syncing user:', userId);
  await attachOneSignalUser(OneSignalModule, userId);

  const currentId = await getSubscriptionIdWithRetry(OneSignalModule, 30, 500);
  if (currentId) {
    await linkPlayerIdToProfile(currentId);
  }
}

async function linkPlayerIdToProfile(playerId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[OneSignal] Cannot link player ID - no user');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId, push_notifications_enabled: true })
      .eq('id', user.id);

    if (error) {
      console.error('[OneSignal] ❌ Failed to save player ID:', error);
    } else {
      console.log('[OneSignal] ✅ Player ID linked:', playerId, 'for user:', user.id);
    }
  } catch (error) {
    console.error('[OneSignal] ❌ linkPlayerIdToProfile error:', error);
  }
}

export async function markPushPromptSeen() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  await supabase
    .from('profiles')
    .update({ push_prompt_seen: true })
    .eq('id', user.id);
}

export async function setPushPreference(enabled: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { enabled: false, reason: 'not_authenticated' as const };

  console.log('[OneSignal] setPushPreference:', enabled);

  // Update DB FIRST for instant UI feedback
  await supabase
    .from('profiles')
    .update({ push_notifications_enabled: enabled, push_prompt_seen: true })
    .eq('id', user.id);

  if (!enabled) {
    getOneSignalModule().then(mod => mod?.User?.PushSubscription?.optOut?.()).catch(() => null);
    return { enabled: false, reason: 'disabled' as const };
  }

  if (typeof Notification === 'undefined') {
    console.warn('[OneSignal] Notifications API not available');
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'unsupported' as const };
  }

  console.log('[OneSignal] Current permission:', Notification.permission);

  // Always ensure OneSignal is initialized first
  await initOneSignal();
  const OneSignalModule = await getOneSignalModule();

  if (Notification.permission !== 'granted' && OneSignalModule) {
    console.log('[OneSignal] Requesting permission...');
    try {
      await OneSignalModule.Notifications.requestPermission();
    } catch (e) {
      console.error('[OneSignal] Permission request error:', e);
    }
    console.log('[OneSignal] Permission after request:', Notification.permission);
  }

  if (Notification.permission !== 'granted') {
    console.warn('[OneSignal] Permission denied or dismissed');
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'denied' as const };
  }

  // OptIn and sync
  if (OneSignalModule) {
    try {
      console.log('[OneSignal] Opting in...');
      await OneSignalModule.User.PushSubscription.optIn().catch((e: any) => console.warn('[OneSignal] optIn error:', e));
      console.log('[OneSignal] OptedIn:', OneSignalModule.User.PushSubscription.optedIn);
      await syncOneSignalUser(user.id);
    } catch (err) {
      console.error('[OneSignal] OptIn/sync error:', err);
    }
  }

  return { enabled: true, reason: 'enabled' as const };
}

export async function autoPromptPushPermission() {
  await setPushPreference(true);
}

export async function promptPushPermission() {
  await setPushPreference(true);
}
