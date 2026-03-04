import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'd1373810-d2ca-4689-8858-178e45d144c4';

let oneSignalInitPromise: Promise<void> | null = null;
let oneSignalInitialized = false;

async function getOneSignalModule() {
  return import('react-onesignal').then(m => m.default).catch(() => null);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCurrentSubscriptionId(OneSignalModule: any): Promise<string | null> {
  const directId = OneSignalModule?.User?.PushSubscription?.id;
  if (directId) return directId;

  const asyncId = await OneSignalModule?.User?.PushSubscription?.getIdAsync?.().catch(() => null);
  if (asyncId) return asyncId;

  return null;
}

async function getSubscriptionIdWithRetry(OneSignalModule: any, retries = 20, delayMs = 500): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    const id = await getCurrentSubscriptionId(OneSignalModule);
    if (id) return id;
    await wait(delayMs);
  }
  return null;
}

async function attachOneSignalUser(OneSignalModule: any, userId: string) {
  await OneSignalModule?.login?.(userId).catch(() => null);
  await OneSignalModule?.User?.addAlias?.('external_id', userId).catch(() => null);
}

export async function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  if (oneSignalInitialized) return;
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    const OneSignalModule = await getOneSignalModule();
    if (!OneSignalModule) {
      console.warn('OneSignal SDK not available');
      return;
    }

    try {
      await OneSignalModule.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: 'web.onesignal.auto.69a0d04c-4cfa-4f80-8d34-652264ce8748',
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/push/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/push/OneSignalSDKUpdaterWorker.js',
        serviceWorkerParam: { scope: '/push/' },
        notifyButton: { enable: true },
        promptOptions: {
          autoPrompt: false,
        },
      });

      oneSignalInitialized = true;
      console.log('OneSignal initialized');

      // Set default URL for notification clicks (PWA)
      if (OneSignalModule.Notifications?.setDefaultUrl) {
        OneSignalModule.Notifications.setDefaultUrl('https://play-maker-palace.lovable.app');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await attachOneSignalUser(OneSignalModule, user.id);
      }

      OneSignalModule.User.PushSubscription.addEventListener('change', async (event: any) => {
        let playerId = event?.current?.id || event?.current?.subscriptionId || event?.current?.token;
        if (!playerId) {
          playerId = await getCurrentSubscriptionId(OneSignalModule);
        }
        if (playerId) {
          await linkPlayerIdToProfile(playerId);
        }
      });

      const currentId = await getSubscriptionIdWithRetry(OneSignalModule, 20, 500);
      if (currentId) {
        await linkPlayerIdToProfile(currentId);
      }
    } catch (error) {
      console.error('OneSignal init error:', error);
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

  await attachOneSignalUser(OneSignalModule, userId);
  const currentId = await getSubscriptionIdWithRetry(OneSignalModule, 20, 500);
  if (currentId) {
    await linkPlayerIdToProfile(currentId);
  }
}

async function linkPlayerIdToProfile(playerId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId, push_notifications_enabled: true } as any)
      .eq('id', user.id);

    console.log('OneSignal Player ID linked:', playerId);
  } catch (error) {
    console.error('Failed to link OneSignal Player ID:', error);
  }
}

export async function markPushPromptSeen() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  await supabase
    .from('profiles')
    .update({ push_prompt_seen: true } as any)
    .eq('id', user.id);
}

export async function setPushPreference(enabled: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { enabled: false, reason: 'not_authenticated' as const };

  // Update DB FIRST for instant UI feedback
  await supabase
    .from('profiles')
    .update({ push_notifications_enabled: enabled, push_prompt_seen: true } as any)
    .eq('id', user.id);

  if (!enabled) {
    // Fire-and-forget SDK optOut
    getOneSignalModule().then(mod => mod?.User?.PushSubscription?.optOut?.()).catch(() => null);
    return { enabled: false, reason: 'disabled' as const };
  }

  if (typeof Notification === 'undefined') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'unsupported' as const };
  }

  if (Notification.permission !== 'granted') {
    const OneSignalModule = await getOneSignalModule();
    if (OneSignalModule) {
      await initOneSignal();
      await OneSignalModule.Notifications.requestPermission().catch(() => false);
    }
  }

  if (Notification.permission !== 'granted') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'denied' as const };
  }

  // Fire-and-forget SDK optIn + sync
  initOneSignal().then(async () => {
    const mod = await getOneSignalModule();
    if (mod) {
      await mod.User.PushSubscription.optIn().catch(() => null);
      await syncOneSignalUser(user.id);
    }
  }).catch(() => null);

  return { enabled: true, reason: 'enabled' as const };
}

export async function autoPromptPushPermission() {
  await setPushPreference(true);
}

export async function promptPushPermission() {
  await setPushPreference(true);
}
