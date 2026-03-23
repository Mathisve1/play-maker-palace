import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

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

serve(async (req: Request) => {
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

      const { email, invite_token, role, club_name, partner_id, partner_name } = await req.json();
      if (!email || !invite_token) {
        return new Response(JSON.stringify({ error: "Email en token zijn verplicht." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateEmail(email)) {
        return new Response(JSON.stringify({ error: "Ongeldig e-mailadres." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "Email service niet geconfigureerd." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isPartnerInvite = role === 'partner_admin' && partner_id;
      const origin = req.headers.get("origin") || "https://play-maker-palace.lovable.app";
      const inviteLink = isPartnerInvite
        ? `${origin}/club-invite/${invite_token}?partner_id=${partner_id}`
        : `${origin}/club-invite/${invite_token}`;
      const roleLabel = isPartnerInvite ? 'Partner Beheerder' : role === 'bestuurder' ? 'Bestuurder' : role === 'beheerder' ? 'Beheerder' : 'Medewerker';
      const contextName = isPartnerInvite ? (partner_name || club_name || 'een partner') : (club_name || 'een club');

      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "De 12e Man <onboarding@resend.dev>",
          to: [email],
          subject: `Je bent uitgenodigd voor ${contextName} op De 12e Man`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2>Je bent uitgenodigd!</h2>
              <p>Je bent uitgenodigd om ${isPartnerInvite ? `beheerder te worden van <strong>${partner_name || 'een partner'}</strong> bij <strong>${club_name || 'een club'}</strong>` : `lid te worden van <strong>${club_name || 'een club'}</strong>`} als <strong>${roleLabel}</strong>.</p>
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
        return new Response(JSON.stringify({ error: "E-mail kon niet worden verstuurd." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (isPartnerInvite) {
        await supabaseAdmin.from("club_invitations").update({
          email: email,
        }).eq("invite_token", invite_token);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("club-invite send-email error:", err);
      return new Response(JSON.stringify({ error: "Er is een fout opgetreden." }), {
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

      const { data: club } = await supabaseAdmin
        .from("clubs")
        .select("name, logo_url, sport")
        .eq("id", invite.club_id)
        .maybeSingle();

      const urlPartnerId = url.searchParams.get("partner_id");
      let partnerName: string | null = null;
      if (urlPartnerId) {
        const { data: partner } = await supabaseAdmin
          .from("external_partners").select("name").eq("id", urlPartnerId).maybeSingle();
        partnerName = partner?.name || null;
      }

      return new Response(JSON.stringify({
        role: invite.role,
        status: invite.status,
        expires_at: invite.expires_at,
        club_name: club?.name || null,
        club_logo: club?.logo_url || null,
        club_sport: club?.sport || null,
        partner_id: urlPartnerId || null,
        partner_name: partnerName,
        is_partner_invite: !!urlPartnerId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("club-invite info error:", err);
      return new Response(JSON.stringify({ error: "Er is een fout opgetreden." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Sign up invited user + accept
  if (action === "signup-and-accept" && req.method === "POST") {
    try {
      const body = await req.json();
      const { token, email, password, full_name, partner_id } = body;
      if (!token || !email || !password) {
        return new Response(JSON.stringify({ error: "Alle velden zijn verplicht." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateEmail(email)) {
        return new Response(JSON.stringify({ error: "Ongeldig e-mailadres." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 8 || password.length > 128) {
        return new Response(JSON.stringify({ error: "Wachtwoord moet tussen 8 en 128 tekens zijn." }), {
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

      let userId: string;
      const safeName = (full_name || "").substring(0, 100);
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { full_name: safeName },
      });

      if (authErr) {
        if (authErr.message?.includes("already been registered")) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
          if (existingUser) {
            userId = existingUser.id;
          } else {
            return new Response(JSON.stringify({ error: "Account bestaat al. Probeer in te loggen." }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.error("Auth error during invite signup:", authErr);
          return new Response(JSON.stringify({ error: "Registratie mislukt. Controleer je gegevens." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = authData.user.id;
      }
      const isPartnerInvite = !!partner_id;

      if (isPartnerInvite) {
        await supabaseAdmin.from("partner_admins").upsert({
          partner_id: partner_id,
          user_id: userId,
          invited_by: invite.invited_by,
        }, { onConflict: "partner_id,user_id" });
      } else {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: "club_owner" })
          .eq("user_id", userId);

        await supabaseAdmin
          .from("club_members")
          .upsert({
            club_id: invite.club_id,
            user_id: userId,
            role: invite.role,
          }, { onConflict: "club_id,user_id" });
      }

      await supabaseAdmin
        .from("club_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      await sendAcceptNotification(supabaseAdmin, invite, safeName || email);

      return new Response(JSON.stringify({ success: true, club_id: invite.club_id, is_partner: isPartnerInvite }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("club-invite signup-and-accept error:", err);
      return new Response(JSON.stringify({ error: "Er is een fout opgetreden." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Accept invitation (existing user)
  if (action === "accept" && req.method === "POST") {
    try {
      const body = await req.json();
      const { token, user_id, partner_id } = body;
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

      const isPartnerInvite = !!partner_id;

      if (isPartnerInvite) {
        await supabaseAdmin.from("partner_admins").upsert({
          partner_id: partner_id,
          user_id: user_id,
          invited_by: invite.invited_by,
        }, { onConflict: "partner_id,user_id" });
      } else {
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
      }

      await supabaseAdmin
        .from("club_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      const { data: acceptorProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", user_id)
        .maybeSingle();

      const acceptorName = acceptorProfile?.full_name || acceptorProfile?.email || "Een gebruiker";
      await sendAcceptNotification(supabaseAdmin, invite, acceptorName);

      return new Response(JSON.stringify({ success: true, club_id: invite.club_id, is_partner: isPartnerInvite }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("club-invite accept error:", err);
      return new Response(JSON.stringify({ error: "Er is een fout opgetreden." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
