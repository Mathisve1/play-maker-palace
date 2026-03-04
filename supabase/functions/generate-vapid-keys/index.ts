import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Build the raw uncompressed public key for applicationServerKey
    const x = b64urlDecode(publicKeyJwk.x!);
    const y = b64urlDecode(publicKeyJwk.y!);
    const publicKeyRaw = new Uint8Array(65);
    publicKeyRaw[0] = 0x04;
    publicKeyRaw.set(x, 1);
    publicKeyRaw.set(y, 33);
    const publicKeyBase64 = b64urlEncode(publicKeyRaw);

    // Store the full private JWK as JSON string — no conversion needed later
    const privateJwk = JSON.stringify({
      kty: privateKeyJwk.kty,
      crv: privateKeyJwk.crv,
      x: privateKeyJwk.x,
      y: privateKeyJwk.y,
      d: privateKeyJwk.d,
    });

    return new Response(
      JSON.stringify({
        publicKey: publicKeyBase64,
        privateJwk,
        instruction: 'Store publicKey as VAPID_PUBLIC_KEY and privateJwk as VAPID_PRIVATE_JWK in your secrets.',
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

function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - b.length % 4) % 4);
  const bin = atob(b + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
