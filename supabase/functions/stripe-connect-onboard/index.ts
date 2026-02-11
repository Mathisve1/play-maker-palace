import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { account_type, return_url, refresh_url } = await req.json();
    // account_type: 'club' or 'volunteer'

    const origin = req.headers.get("origin") || "https://play-maker-palace.lovable.app";

    if (account_type === "club") {
      // Check if user owns a club
      let { data: club } = await supabaseClient
        .from("clubs")
        .select("id, stripe_account_id, name")
        .eq("owner_id", user.id)
        .maybeSingle();

      // If not owner, check membership
      if (!club) {
        const { data: membership } = await supabaseClient
          .from("club_members")
          .select("club_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (membership) {
          const { data: memberClub } = await supabaseClient
            .from("clubs")
            .select("id, stripe_account_id, name")
            .eq("id", membership.club_id)
            .maybeSingle();
          if (memberClub) club = memberClub;
        }
      }

      if (!club) throw new Error("No club found for this user");

      let accountId = club.stripe_account_id;

      if (!accountId) {
        // Create Express connected account for club
        const account = await stripe.accounts.create({
          type: "express",
          country: "BE",
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "non_profit",
          business_profile: {
            name: club.name,
            mcc: "7941", // Sports clubs
          },
        });
        accountId = account.id;

        await supabaseClient
          .from("clubs")
          .update({ stripe_account_id: accountId })
          .eq("id", club.id);
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refresh_url || `${origin}/club-dashboard`,
        return_url: return_url || `${origin}/club-dashboard`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url, account_id: accountId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (account_type === "volunteer") {
      // Check if volunteer already has a stripe account
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("id, stripe_account_id, full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) throw new Error("No profile found");

      let accountId = profile.stripe_account_id;

      if (!accountId) {
        // Create Express connected account for volunteer
        const account = await stripe.accounts.create({
          type: "express",
          country: "BE",
          email: profile.email || user.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          individual: {
            first_name: profile.full_name?.split(" ")[0] || undefined,
            last_name: profile.full_name?.split(" ").slice(1).join(" ") || undefined,
            email: profile.email || user.email,
          },
        });
        accountId = account.id;

        await supabaseClient
          .from("profiles")
          .update({ stripe_account_id: accountId })
          .eq("id", user.id);
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refresh_url || `${origin}/dashboard`,
        return_url: return_url || `${origin}/dashboard`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url, account_id: accountId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid account_type. Use 'club' or 'volunteer'.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[stripe-connect-onboard] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
