import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * One-time utility to generate VAPID keys for Web Push.
 * Call once, copy the keys, store as secrets, then delete this function.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    // Export keys
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Convert JWK to the URL-safe base64 format used by VAPID
    // Public key: uncompressed point (0x04 || x || y)
    const x = base64UrlToUint8Array(publicKeyJwk.x!);
    const y = base64UrlToUint8Array(publicKeyJwk.y!);
    const publicKeyRaw = new Uint8Array(65);
    publicKeyRaw[0] = 0x04;
    publicKeyRaw.set(x, 1);
    publicKeyRaw.set(y, 33);
    const publicKeyBase64 = uint8ArrayToBase64Url(publicKeyRaw);

    // Private key: just the d parameter
    const privateKeyBase64 = privateKeyJwk.d!;

    return new Response(
      JSON.stringify({
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
        instruction: 'Store publicKey as VAPID_PUBLIC_KEY and privateKey as VAPID_PRIVATE_KEY in your secrets. Add publicKey to your frontend as VITE_VAPID_PUBLIC_KEY.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
