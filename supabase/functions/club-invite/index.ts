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

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Accept invitation (public - no auth needed, uses token)
  if (action === "accept" && req.method === "POST") {
    try {
      const { token, user_id } = await req.json();
      if (!token || !user_id) {
        return new Response(JSON.stringify({ error: "Token en user_id zijn verplicht." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find invitation
      const { data: invite, error: invErr } = await supabaseAdmin
        .from("club_invitations")
        .select("*")
        .eq("invite_token", token)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (invErr || !invite) {
        return new Response(JSON.stringify({ error: "Uitnodiging niet gevonden of verlopen." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add user as club member
      const { error: memberErr } = await supabaseAdmin
        .from("club_members")
        .upsert({
          club_id: invite.club_id,
          user_id,
          role: invite.role,
        }, { onConflict: "club_id,user_id" });

      if (memberErr) {
        return new Response(JSON.stringify({ error: memberErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure user has club_owner app role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existingRole && existingRole.role !== "club_owner") {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: "club_owner" })
          .eq("user_id", user_id);
      }

      // Mark invitation as accepted
      await supabaseAdmin
        .from("club_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      return new Response(JSON.stringify({ success: true, club_id: invite.club_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
