import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, club_name, sport, location, logo_url } = await req.json();

    if (!email || !password || !club_name) {
      return new Response(JSON.stringify({ error: "Email, password en clubnaam zijn verplicht." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create user via admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Update role from volunteer to club_owner
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "club_owner" })
      .eq("user_id", userId);

    if (roleError) {
      console.error("Role update error:", roleError);
    }

    // Create the club with extra fields
    const { error: clubError } = await supabaseAdmin
      .from("clubs")
      .insert({
        name: club_name,
        owner_id: userId,
        sport: sport || null,
        location: location || null,
        logo_url: logo_url || null,
      });

    if (clubError) {
      console.error("Club creation error:", clubError);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
