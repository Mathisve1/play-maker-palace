import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, club_name, sport, location, logo_url } = await req.json();

    // Input validation
    if (!email || !password || !club_name) {
      return new Response(JSON.stringify({ error: "Email, password en clubnaam zijn verplicht." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: "Ongeldig e-mailadres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8 || password.length > 128) {
      return new Response(JSON.stringify({ error: "Wachtwoord moet tussen 8 en 128 tekens zijn." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (club_name.length > 100) {
      return new Response(JSON.stringify({ error: "Clubnaam mag maximaal 100 tekens zijn." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = (full_name || "").substring(0, 100);
    const safeSport = (sport || "").substring(0, 50) || null;
    const safeLocation = (location || "").substring(0, 200) || null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: safeName },
    });

    if (authError) {
      // Don't expose internal auth error details
      const userMessage = authError.message?.includes("already been registered")
        ? "Dit e-mailadres is al geregistreerd."
        : "Registratie mislukt. Controleer je gegevens.";
      return new Response(JSON.stringify({ error: userMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "club_owner" })
      .eq("user_id", userId);

    if (roleError) {
      console.error("Role update error:", roleError);
    }

    const { error: clubError } = await supabaseAdmin
      .from("clubs")
      .insert({
        name: club_name.substring(0, 100),
        owner_id: userId,
        sport: safeSport,
        location: safeLocation,
        logo_url: logo_url || null,
      });

    if (clubError) {
      console.error("Club creation error:", clubError);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("club-signup error:", err);
    return new Response(JSON.stringify({ error: "Er is een fout opgetreden. Probeer het opnieuw." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
