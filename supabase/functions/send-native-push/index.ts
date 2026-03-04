import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Web Push helpers ──────────────────────────────────────────────

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const bin = atob(b64 + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importVapidPrivateKey(privateKeyB64: string, publicKeyB64: string) {
  const privBytes = base64UrlToUint8Array(privateKeyB64);
  const pubRaw = base64UrlToUint8Array(publicKeyB64);
  const x = uint8ArrayToBase64Url(pubRaw.slice(1, 33));
  const y = uint8ArrayToBase64Url(pubRaw.slice(33, 65));
  const d = uint8ArrayToBase64Url(privBytes);

  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

async function createVapidJwt(audience: string, subject: string, privateKey: CryptoKey): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    enc.encode(unsigned)
  );

  // Convert DER signature to raw r||s
  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    // DER format
    const rLen = sigBytes[3];
    const rStart = 4;
    r = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    s = sigBytes.slice(sStart, sStart + sLen);
    // Pad/trim to 32 bytes
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) { const t = new Uint8Array(32); t.set(r, 32 - r.length); r = t; }
    if (s.length < 32) { const t = new Uint8Array(32); t.set(s, 32 - s.length); s = t; }
  }
  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsigned}.${uint8ArrayToBase64Url(rawSig)}`;
}

async function encryptPayload(
  p256dhB64: string,
  authB64: string,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPubBytes = base64UrlToUint8Array(p256dhB64);
  const authSecret = base64UrlToUint8Array(authB64);

  const clientPubKey = await crypto.subtle.importKey(
    'raw', clientPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey },
    localKeyPair.privateKey, 256
  );

  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK from auth_secret
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const ikmAuth = await crypto.subtle.importKey('raw', authSecret, { name: 'HKDF' }, false, ['deriveBits']);
  const prkAuthBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(sharedSecret), info: authInfo }, ikmAuth, 256
  );

  // IKM
  const ikm = new Uint8Array(prkAuthBits);

  // Derive key
  const contextInfo = createInfo('aesgcm', clientPubBytes, localPubRaw);
  const nonceInfo = createInfo('nonce', clientPubBytes, localPubRaw);

  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const keyBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: contextInfo }, ikmKey, 128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, ikmKey, 96
  );

  const encKey = await crypto.subtle.importKey('raw', keyBits, { name: 'AES-GCM' }, false, ['encrypt']);

  // Pad payload (2 bytes padding length + payload)
  const padded = new Uint8Array(2 + payload.length);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(payload, 2);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBits) }, encKey, padded
  );

  return { ciphertext: new Uint8Array(encrypted), salt, localPublicKey: localPubRaw };
}

function createInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const label = enc.encode(`Content-Encoding: ${type}\0`);
  const contextLabel = enc.encode('P-256\0');

  const info = new Uint8Array(
    label.length + contextLabel.length + 2 + clientPub.length + 2 + serverPub.length
  );
  let offset = 0;
  info.set(label, offset); offset += label.length;
  info.set(contextLabel, offset); offset += contextLabel.length;
  info[offset++] = 0; info[offset++] = clientPub.length;
  info.set(clientPub, offset); offset += clientPub.length;
  info[offset++] = 0; info[offset++] = serverPub.length;
  info.set(serverPub, offset);
  return info;
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payloadObj: Record<string, unknown>,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey,
  vapidSubject: string
): Promise<{ success: boolean; status?: number; body?: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const { ciphertext, salt, localPublicKey } = await encryptPayload(p256dh, auth, payloadBytes);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      'Content-Encoding': 'aesgcm',
      'Content-Type': 'application/octet-stream',
      'Encryption': `salt=${uint8ArrayToBase64Url(salt)}`,
      'Crypto-Key': `dh=${uint8ArrayToBase64Url(localPublicKey)}`,
      'TTL': '86400',
    },
    body: ciphertext,
  });

  const body = await res.text();
  return { success: res.status >= 200 && res.status < 300, status: res.status, body };
}

// ── Notification templates ────────────────────────────────────────

const TEMPLATES: Record<string, Record<string, { title: string; message: string }>> = {
  task_reminder: {
    nl: { title: '📋 Taakherinnering', message: 'Je hebt een taak die binnenkort begint.' },
    fr: { title: '📋 Rappel de tâche', message: 'Vous avez une tâche qui commence bientôt.' },
    en: { title: '📋 Task Reminder', message: 'You have a task starting soon.' },
  },
  contract_update: {
    nl: { title: '📝 Contractupdate', message: 'Er is een update voor je contract.' },
    fr: { title: '📝 Mise à jour du contrat', message: 'Il y a une mise à jour de votre contrat.' },
    en: { title: '📝 Contract Update', message: 'There is an update to your contract.' },
  },
  club_invitation: {
    nl: { title: '🎉 Clubuitnodiging', message: 'Je bent uitgenodigd voor een club!' },
    fr: { title: '🎉 Invitation au club', message: 'Vous êtes invité(e) à rejoindre un club !' },
    en: { title: '🎉 Club Invitation', message: 'You have been invited to join a club!' },
  },
};

// ── Main handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, user_id, title, message, url, data, broadcast } = await req.json();

    const vapidPubKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = 'mailto:info@de12eman.be';

    if (!vapidPubKey || !vapidPrivKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const privateKey = await importVapidPrivateKey(vapidPrivKey, vapidPubKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === BROADCAST MODE ===
    if (broadcast) {
      const finalTitle = title || '📢 De 12e Man';
      const finalMessage = message || 'Je hebt een nieuwe melding.';

      // Get all push subscriptions for users who have push enabled
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, user_id');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, push_notifications_enabled, in_app_notifications_enabled');

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      let sent = 0;
      let failed = 0;

      for (const sub of (subs || [])) {
        const profile = profileMap.get(sub.user_id);
        if (profile?.push_notifications_enabled === false) continue;

        const result = await sendWebPush(
          sub.endpoint, sub.p256dh, sub.auth,
          { title: finalTitle, body: finalMessage, url: url || '/dashboard' },
          vapidPubKey, privateKey, vapidSubject
        );

        if (result.success) sent++;
        else {
          failed++;
          // Remove expired subscriptions (410 Gone)
          if (result.status === 410 || result.status === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      }

      // In-app notifications
      const inAppRecipients = (profiles || []).filter((p: any) => p.in_app_notifications_enabled !== false);
      if (inAppRecipients.length > 0) {
        await supabase.from('notifications').insert(
          inAppRecipients.map((p: any) => ({
            user_id: p.id,
            type: type || 'broadcast',
            title: finalTitle,
            message: finalMessage,
          }))
        );
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'broadcast', sent, failed, in_app: inAppRecipients.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === SINGLE USER MODE ===
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id or broadcast=true required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, language, push_notifications_enabled, in_app_notifications_enabled')
      .eq('id', user_id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lang = profile.language || 'nl';
    let finalTitle = title;
    let finalMessage = message;

    if (!finalTitle && type && TEMPLATES[type]) {
      const tpl = TEMPLATES[type][lang] || TEMPLATES[type]['nl'];
      finalTitle = tpl.title;
      finalMessage = tpl.message;
    }
    finalTitle = finalTitle || '📢 De 12e Man';
    finalMessage = finalMessage || 'Je hebt een nieuwe melding.';

    let pushResult: any = { skipped: true, reason: 'disabled_or_no_subscription' };

    if (profile.push_notifications_enabled !== false) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user_id);

      if (subs && subs.length > 0) {
        let anySent = false;
        for (const sub of subs) {
          const result = await sendWebPush(
            sub.endpoint, sub.p256dh, sub.auth,
            { title: finalTitle, body: finalMessage, url: url || '/dashboard' },
            vapidPubKey, privateKey, vapidSubject
          );
          if (result.success) anySent = true;
          else if (result.status === 410 || result.status === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
          console.log(`Push to ${user_id}: status=${result.status}`);
        }
        pushResult = { sent: anySent, subscriptions: subs.length };
      }
    }

    // In-app notification
    let inAppInserted = false;
    if (profile.in_app_notifications_enabled !== false) {
      await supabase.from('notifications').insert({
        user_id,
        type: type || 'general',
        title: finalTitle,
        message: finalMessage,
      });
      inAppInserted = true;
    }

    return new Response(
      JSON.stringify({ success: true, push: pushResult, in_app_sent: inAppInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
