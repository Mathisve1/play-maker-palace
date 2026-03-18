import { supabase } from '@/integrations/supabase/client';

// Public VAPID key — safe to embed client-side
const VAPID_PUBLIC_KEY = 'BL7NNC2ohlSSuBoIooTwOou_M4jm8gX8UHQVF4yHNaKFSc2JB_pxrUL5Z--uGeFinz4wYFKssfPKmkQqAXzi54w';
const PUSH_SW_URL = '/push/push-sw.js';
const PUSH_SW_SCOPE = '/push/';
const LEGACY_PUSH_SW_URL = '/push-sw.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getRegistrationScriptUrl(registration: ServiceWorkerRegistration): string {
  return registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
}

function isDedicatedPushWorker(scriptUrl: string): boolean {
  return scriptUrl.includes(PUSH_SW_URL);
}

function isLegacyPushWorker(scriptUrl: string): boolean {
  return scriptUrl.endsWith(LEGACY_PUSH_SW_URL) && !isDedicatedPushWorker(scriptUrl);
}

function isAnyPushWorker(scriptUrl: string): boolean {
  return isDedicatedPushWorker(scriptUrl) || isLegacyPushWorker(scriptUrl);
}

async function waitForRegistrationActivation(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return;

  const worker = registration.installing || registration.waiting;
  if (!worker) return;

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 4000);
    worker.addEventListener('statechange', () => {
      if (registration.active) {
        window.clearTimeout(timeout);
        resolve();
      }
    });
  });
}

async function registerPushWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
  await registration.update();
  await waitForRegistrationActivation(registration);
  return registration;
}

function getSubscriptionPayload(subscription: PushSubscription) {
  const subJson = subscription.toJSON();
  const endpoint = subJson.endpoint || '';
  const p256dh = subJson.keys?.p256dh || '';
  const auth = subJson.keys?.auth || '';

  if (!endpoint || !p256dh || !auth) {
    throw new Error('invalid_subscription_payload');
  }

  return { endpoint, p256dh, auth };
}

async function persistSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const { endpoint, p256dh, auth } = getSubscriptionPayload(subscription);

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'user_id,endpoint' }
    );

  if (error) {
    throw error;
  }

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .neq('endpoint', endpoint);
}

async function cleanupLegacyPushRegistrations(userId: string): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const legacyEndpoints: string[] = [];

  for (const registration of registrations) {
    const scriptUrl = getRegistrationScriptUrl(registration);
    if (!scriptUrl || !isAnyPushWorker(scriptUrl)) continue;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      legacyEndpoints.push(subscription.endpoint);
      try {
        await subscription.unsubscribe();
      } catch (error) {
        console.warn('[Push] Failed to unsubscribe stale subscription:', error);
      }
    }

    if (isLegacyPushWorker(scriptUrl)) {
      try {
        await registration.unregister();
        console.log('[Push] Removed legacy push worker:', scriptUrl);
      } catch (error) {
        console.warn('[Push] Failed to unregister legacy push worker:', error);
      }
    }
  }

  if (legacyEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', legacyEndpoints);
  }
}

async function createFreshSubscription(userId: string): Promise<PushSubscription> {
  await cleanupLegacyPushRegistrations(userId);

  const registration = await registerPushWorker();
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    try {
      await existingSubscription.unsubscribe();
    } catch (error) {
      console.warn('[Push] Failed to clear existing dedicated subscription:', error);
    }
  }

  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: new Uint8Array(applicationServerKey) as BufferSource,
  });

  await persistSubscription(userId, subscription);
  return subscription;
}

/**
 * Register the dedicated push service worker and subscribe the browser to Web Push.
 * Stores the subscription in the push_subscriptions table.
 */
export async function subscribeToPush(): Promise<{ enabled: boolean; reason: string }> {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { enabled: false, reason: 'unsupported' };
  }

  // iOS Safari requires permission request to happen directly in the user gesture.
  const permission = await Notification.requestPermission();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enabled: false, reason: 'not_authenticated' };

  if (permission !== 'granted') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false })
      .eq('id', user.id);
    return { enabled: false, reason: 'denied' };
  }

  try {
    await createFreshSubscription(user.id);

    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: true, push_prompt_seen: true })
      .eq('id', user.id);

    console.log('[Push] ✅ Subscribed successfully with dedicated worker');
    return { enabled: true, reason: 'enabled' };
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false })
      .eq('id', user.id);
    return { enabled: false, reason: 'error' };
  }
}

/**
 * Unsubscribe from push and remove subscriptions from database.
 */
export async function unsubscribeFromPush(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const scriptUrl = getRegistrationScriptUrl(registration);
      if (!scriptUrl || !isAnyPushWorker(scriptUrl)) continue;

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      if (isLegacyPushWorker(scriptUrl)) {
        await registration.unregister();
      }
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);
  } catch (e) {
    console.error('[Push] Unsubscribe error:', e);
  }

  await supabase
    .from('profiles')
    .update({ push_notifications_enabled: false })
    .eq('id', user.id);
}

/**
 * Toggle push preference. Used by profile settings and banner.
 */
export async function setPushPreference(enabled: boolean): Promise<{ enabled: boolean; reason: string }> {
  if (!enabled) {
    await unsubscribeFromPush();
    return { enabled: false, reason: 'disabled' };
  }
  return subscribeToPush();
}

/**
 * Mark the push prompt as seen so the banner doesn't show again.
 */
export async function markPushPromptSeen(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;
  await supabase
    .from('profiles')
    .update({ push_prompt_seen: true })
    .eq('id', user.id);
}

/**
 * Auto-resubscribe or migrate old registrations to the dedicated push worker.
 */
export async function autoResubscribeIfNeeded(): Promise<void> {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Auto-resub: not supported');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('[Push] Auto-resub: no user');
      return;
    }
    const user = session.user;

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_notifications_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.push_notifications_enabled) {
      console.log('[Push] Auto-resub: push not enabled in profile');
      return;
    }

    if (Notification.permission === 'denied') {
      console.log('[Push] Auto-resub: permission denied');
      await supabase.from('profiles').update({ push_notifications_enabled: false }).eq('id', user.id);
      return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasLegacyRegistration = registrations.some((registration) => isLegacyPushWorker(getRegistrationScriptUrl(registration)));

    const registration = await registerPushWorker();
    const dedicatedSubscription = await registration.pushManager.getSubscription();

    const { data: dbSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', user.id);

    const dbEndpoints = (dbSubscriptions || []).map((subscription) => subscription.endpoint);
    const hasDedicatedDbSubscription = !!dedicatedSubscription && dbEndpoints.includes(dedicatedSubscription.endpoint);

    if (dedicatedSubscription && !hasLegacyRegistration) {
      if (!hasDedicatedDbSubscription || dbEndpoints.length > 1) {
        await persistSubscription(user.id, dedicatedSubscription);
      }
      console.log('[Push] Auto-resub: dedicated subscription is healthy');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Push] Auto-resub: permission not granted');
        await supabase.from('profiles').update({ push_notifications_enabled: false }).eq('id', user.id);
        return;
      }
    }

    console.log('[Push] Migrating push registration to dedicated worker');
    await createFreshSubscription(user.id);
    await supabase.from('profiles').update({ push_notifications_enabled: true }).eq('id', user.id);
    console.log('[Push] ✅ Auto-resubscribed successfully');
  } catch (err) {
    console.error('[Push] Auto-resubscribe error:', err);
  }
}
