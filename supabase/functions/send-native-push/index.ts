import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Base64url helpers ─────────────────────────────────────────────

function b64url(arr: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - b.length % 4) % 4);
  const bin = atob(b + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ── VAPID JWT ─────────────────────────────────────────────────────

async function importVapidKey(privB64: string, pubB64: string): Promise<CryptoKey> {
  const pub = b64urlDecode(pubB64);
  return crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256',
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
    d: privB64,  // already base64url
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function vapidJwt(aud: string, sub: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const h = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub })));
  const unsigned = `${h}.${p}`;

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)
  ));

  // Deno returns raw 64-byte r||s for P-256, but handle DER just in case
  let raw: Uint8Array;
  if (sig.length === 64) {
    raw = sig;
  } else {
    // Parse DER
    let pos = 3;
    const rLen = sig[pos++];
    let r = sig.slice(pos, pos + rLen); pos += rLen + 1;
    const sLen = sig[pos++];
    let s = sig.slice(pos, pos + sLen);
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    raw = new Uint8Array(64);
    raw.set(r.length < 32 ? padStart(r, 32) : r, 0);
    raw.set(s.length < 32 ? padStart(s, 32) : s, 32);
  }
  return `${unsigned}.${b64url(raw)}`;
}

function padStart(arr: Uint8Array, len: number): Uint8Array {
  const t = new Uint8Array(len);
  t.set(arr, len - arr.length);
  return t;
}

// ── RFC 8291 aes128gcm encryption ─────────────────────────────────

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8
  ));
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}

async function encrypt(p256dhB64: string, authB64: string, payload: Uint8Array): Promise<Uint8Array> {
  const uaPub = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);
  const enc = new TextEncoder();

  // Generate local ECDH key pair
  const localKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKP.publicKey));

  // Import user agent public key
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // ECDH shared secret
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaKey }, localKP.privateKey, 256
  ));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291: IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfoInput = concatBytes(enc.encode('WebPush: info\0'), uaPub, localPubRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfoInput, 32);

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = enc.encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonceInfo = enc.encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad: payload + delimiter (0x02) for last record
  const padded = concatBytes(payload, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, padded
  ));

  // aes128gcm header: salt (16) | rs (4) | idlen (1) | keyid (65) | ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPubRaw.length;
  header.set(localPubRaw, 21);

  return concatBytes(header, ciphertext);
}

// ── Send push to a single subscription ────────────────────────────

async function sendPush(
  endpoint: string, p256dh: string, auth: string,
  payloadObj: Record<string, unknown>,
  vapidPub: string, vapidKey: CryptoKey, vapidSubject: string
): Promise<{ ok: boolean; status: number; body: string }> {
  const aud = new URL(endpoint);
  const audience = `${aud.protocol}//${aud.host}`;
  const jwt = await vapidJwt(audience, vapidSubject, vapidKey);

  const body = await encrypt(p256dh, auth, new TextEncoder().encode(JSON.stringify(payloadObj)));

  console.log(`Sending push to ${endpoint.slice(0, 80)}`);
  console.log(`VAPID audience: ${audience}, subject: ${vapidSubject}`);
  console.log(`Body size: ${body.length} bytes`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidPub}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  });

  const text = await res.text();
  console.log(`Push ${endpoint.slice(0, 60)}… → ${res.status} ${text.slice(0, 200)}`);
  return { ok: res.status >= 200 && res.status < 300, status: res.status, body: text };
}

// ── Notification templates ────────────────────────────────────────

const TPL: Record<string, Record<string, { title: string; message: string }>> = {
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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('send-native-push invoked');
    const { type, user_id, title, message, url, data, broadcast } = await req.json();
    console.log('Payload:', JSON.stringify({ type, user_id, broadcast, title: !!title, message: !!message }));

    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY')!;
    console.log('VAPID keys present:', !!vapidPub, !!vapidPriv);
    if (!vapidPub || !vapidPriv) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Importing VAPID key...');
    const vapidKey = await importVapidKey(vapidPriv, vapidPub);
    console.log('VAPID key imported successfully');
    const vapidSubject = 'mailto:info@de12eman.be';

    const sbUrl = Deno.env.get('SUPABASE_URL')!;
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(sbUrl, sbKey);

    // ── BROADCAST ──
    if (broadcast) {
      const t = title || '📢 De 12e Man';
      const m = message || 'Je hebt een nieuwe melding.';

      const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth, user_id');
      const { data: profiles } = await supabase.from('profiles').select('id, push_notifications_enabled, in_app_notifications_enabled');
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      let sent = 0, failed = 0;
      for (const sub of (subs || [])) {
        if (pMap.get(sub.user_id)?.push_notifications_enabled === false) continue;
        const r = await sendPush(sub.endpoint, sub.p256dh, sub.auth, { title: t, body: m, url: url || '/dashboard' }, vapidPub, vapidKey, vapidSubject);
        if (r.ok) sent++; else {
          failed++;
          if (r.status === 410 || r.status === 404) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }

      const inApp = (profiles || []).filter((p: any) => p.in_app_notifications_enabled !== false);
      if (inApp.length > 0) {
        await supabase.from('notifications').insert(inApp.map((p: any) => ({ user_id: p.id, type: type || 'broadcast', title: t, message: m })));
      }

      return new Response(JSON.stringify({ success: true, mode: 'broadcast', sent, failed, in_app: inApp.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── SINGLE USER ──
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id or broadcast=true required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('profiles')
      .select('full_name, language, push_notifications_enabled, in_app_notifications_enabled')
      .eq('id', user_id).single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lang = profile.language || 'nl';
    let t = title, m = message;
    if (!t && type && TPL[type]) { const tpl = TPL[type][lang] || TPL[type]['nl']; t = tpl.title; m = tpl.message; }
    t = t || '📢 De 12e Man';
    m = m || 'Je hebt een nieuwe melding.';

    let pushResult: any = { skipped: true };

    if (profile.push_notifications_enabled !== false) {
      const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user_id);
      if (subs && subs.length > 0) {
        let ok = false;
        for (const sub of subs) {
          const r = await sendPush(sub.endpoint, sub.p256dh, sub.auth, { title: t, body: m, url: url || '/dashboard' }, vapidPub, vapidKey, vapidSubject);
          if (r.ok) ok = true;
          else if (r.status === 410 || r.status === 404) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        pushResult = { sent: ok, subscriptions: subs.length };
      }
    }

    let inApp = false;
    if (profile.in_app_notifications_enabled !== false) {
      await supabase.from('notifications').insert({ user_id, type: type || 'general', title: t, message: m });
      inApp = true;
    }

    return new Response(JSON.stringify({ success: true, push: pushResult, in_app_sent: inApp }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Push error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
