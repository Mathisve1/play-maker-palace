import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id, barcode, title, club_name } = await req.json();

    if (!barcode || !ticket_id) {
      return new Response(JSON.stringify({ error: "Missing barcode or ticket_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Google Wallet - create a Save to Google Wallet URL
    // This uses the JWT approach with a service account
    const googleServiceAccountJson = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT");
    let googleWalletUrl: string | null = null;

    if (googleServiceAccountJson) {
      try {
        const serviceAccount = JSON.parse(googleServiceAccountJson);
        const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID") || "";

        // Import jose for JWT signing
        const jose = await import("https://deno.land/x/jose@v5.2.0/index.ts");

        const privateKey = await jose.importPKCS8(serviceAccount.private_key, "RS256");

        const genericObject = {
          id: `${issuerId}.${ticket_id.replace(/-/g, "")}`,
          classId: `${issuerId}.volunteer_ticket`,
          genericType: "GENERIC_TYPE_UNSPECIFIED",
          hexBackgroundColor: "#1a1a2e",
          logo: {
            sourceUri: {
              uri: "https://play-maker-palace.lovable.app/favicon.ico",
            },
          },
          cardTitle: {
            defaultValue: { language: "nl", value: club_name || "PlayMaker Palace" },
          },
          header: {
            defaultValue: { language: "nl", value: title || "Volunteer Ticket" },
          },
          barcode: {
            type: "QR_CODE",
            value: barcode,
          },
          textModulesData: [
            {
              id: "barcode_text",
              header: "Barcode",
              body: barcode,
            },
          ],
        };

        const claims = {
          iss: serviceAccount.client_email,
          aud: "google",
          typ: "savetowallet",
          payload: {
            genericObjects: [genericObject],
          },
        };

        const token = await new jose.SignJWT(claims)
          .setProtectedHeader({ alg: "RS256", typ: "JWT" })
          .setIssuedAt()
          .sign(privateKey);

        googleWalletUrl = `https://pay.google.com/gp/v/save/${token}`;
      } catch (e) {
        console.error("Google Wallet JWT error:", e);
      }
    }

    // Apple Wallet - generate .pkpass
    // Requires APPLE_WALLET_PASS_CERT, APPLE_WALLET_PASS_KEY, APPLE_WALLET_TEAM_ID, APPLE_WALLET_PASS_TYPE_ID
    let pkpassBase64: string | null = null;
    // Apple Wallet .pkpass generation requires native crypto for PKCS7 signing
    // This is complex in Deno Edge Functions, so we provide a placeholder
    // In production, you'd use a dedicated service or pre-signed passes

    return new Response(
      JSON.stringify({
        success: true,
        google_wallet_url: googleWalletUrl,
        pkpass_base64: pkpassBase64,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Wallet pass error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
