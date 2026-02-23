import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function sendAcceptNotification(supabaseAdmin: any, invite: any, acceptorName: string) {
  try {
    const { data: club } = await supabaseAdmin
      .from("clubs").select("name").eq("id", invite.club_id).maybeSingle();
    const clubName = club?.name || "je club";
    const roleLabel = invite.role === 'bestuurder' ? 'Bestuurder' : invite.role === 'beheerder' ? 'Beheerder' : 'Medewerker';
    const title = "Uitnodiging geaccepteerd";
    const message = `${acceptorName} heeft de uitnodiging voor ${clubName} geaccepteerd als ${roleLabel}.`;

    await supabaseAdmin.from("notifications").insert({
      user_id: invite.invited_by, type: "invite_accepted", title, message,
      metadata: { club_id: invite.club_id, role: invite.role, acceptor_name: acceptorName },
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return;
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles").select("email").eq("id", invite.invited_by).maybeSingle();
    if (!inviterProfile?.email) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
from: Deno.env.get("RESEND_FROM_EMAIL") || "De 12e Man <onboarding@resend.dev>",
        to: [inviterProfile.email],
        subject: `${acceptorName} heeft je uitnodiging geaccepteerd`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2>Uitnodiging geaccepteerd! 🎉</h2>
          <p><strong>${acceptorName}</strong> heeft de uitnodiging voor <strong>${clubName}</strong> geaccepteerd als <strong>${roleLabel}</strong>.</p>
          <p>Je kunt het nieuwe lid nu terugvinden in je club dashboard.</p>
          <p style="color:#666;font-size:14px;margin-top:24px;">— De 12e Man</p>
        </div>`,
      }),
    });
  } catch (err) {
    console.error("Failed to send accept notification:", err);
  }
}

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

  // Send invitation email
  if (action === "send-email" && req.method === "POST") {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { email, invite_token, role, club_name } = await req.json();
      if (!email || !invite_token) {
        return new Response(JSON.stringify({ error: "Email en token zijn verplicht." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "Email service niet geconfigureerd." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const origin = req.headers.get("origin") || "https://play-maker-palace.lovable.app";
      const inviteLink = `${origin}/club-invite/${invite_token}`;
      const roleLabel = role === 'bestuurder' ? 'Bestuurder' : role === 'beheerder' ? 'Beheerder' : 'Medewerker';

      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "De 12e Man <onboarding@resend.dev>",
          to: [email],
          subject: `Je bent uitgenodigd voor ${club_name || 'een club'} op De 12e Man`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2>Je bent uitgenodigd!</h2>
              <p>Je bent uitgenodigd om lid te worden van <strong>${club_name || 'een club'}</strong> als <strong>${roleLabel}</strong>.</p>
              <p>Klik op de onderstaande knop om de uitnodiging te accepteren:</p>
              <a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
                Uitnodiging accepteren
              </a>
              <p style="color: #666; font-size: 14px;">Deze uitnodiging verloopt over 7 dagen.</p>
              <p style="color: #999; font-size: 12px;">Als je deze uitnodiging niet verwacht, kun je deze e-mail negeren.</p>
            </div>
          `,
        }),
      });

      if (!emailResp.ok) {
        const errData = await emailResp.json();
        console.error("Resend error:", errData);
        return new Response(JSON.stringify({ error: "E-mail kon niet worden verstuurd. Controleer de Resend configuratie." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Get invitation info (public)
  if (action === "info" && req.method === "GET") {
    try {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token is verplicht." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invite, error } = await supabaseAdmin
        .from("club_invitations")
        .select("role, status, expires_at, club_id")
        .eq("invite_token", token)
        .maybeSingle();

      if (error || !invite) {
        return new Response(JSON.stringify({ error: "Uitnodiging niet gevonden." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get club name
      const { data: club } = await supabaseAdmin
        .from("clubs")
        .select("name, logo_url, sport")
        .eq("id", invite.club_id)
        .maybeSingle();

      return new Response(JSON.stringify({
        role: invite.role,
        status: invite.status,
        expires_at: invite.expires_at,
        club_name: club?.name || null,
        club_logo: club?.logo_url || null,
        club_sport: club?.sport || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Sign up invited user + accept
  if (action === "signup-and-accept" && req.method === "POST") {
    try {
      const { token, email, password, full_name } = await req.json();
      if (!token || !email || !password) {
        return new Response(JSON.stringify({ error: "Alle velden zijn verplicht." }), {
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

      // Create user
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });

      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = authData.user.id;

      // Update user role to club_owner
      await supabaseAdmin
        .from("user_roles")
        .update({ role: "club_owner" })
        .eq("user_id", userId);

      // Add as club member
      await supabaseAdmin
        .from("club_members")
        .upsert({
          club_id: invite.club_id,
          user_id: userId,
          role: invite.role,
        }, { onConflict: "club_id,user_id" });

      // Mark invitation as accepted
      await supabaseAdmin
        .from("club_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      // Send notification to inviter
      await sendAcceptNotification(supabaseAdmin, invite, full_name || email);

      return new Response(JSON.stringify({ success: true, club_id: invite.club_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Accept invitation (existing user)
  if (action === "accept" && req.method === "POST") {
    try {
      const { token, user_id } = await req.json();
      if (!token || !user_id) {
        return new Response(JSON.stringify({ error: "Token en user_id zijn verplicht." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      await supabaseAdmin
        .from("club_members")
        .upsert({
          club_id: invite.club_id,
          user_id,
          role: invite.role,
        }, { onConflict: "club_id,user_id" });

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

      await supabaseAdmin
        .from("club_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      // Get user name for notification
      const { data: acceptorProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", user_id)
        .maybeSingle();
      
      const acceptorName = acceptorProfile?.full_name || acceptorProfile?.email || "Een gebruiker";
      await sendAcceptNotification(supabaseAdmin, invite, acceptorName);

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
