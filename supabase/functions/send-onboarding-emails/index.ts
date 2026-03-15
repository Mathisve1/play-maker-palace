import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── i18n email content ── */
type Lang = 'nl' | 'fr' | 'en';

interface EmailContent { subject: string; html: string }

const APP_URL = 'https://play-maker-palace.lovable.app';

function step1(lang: Lang, clubName: string): EmailContent {
  const t = {
    nl: {
      subject: `Welkom bij De 12e Man 👋`,
      heading: `Welkom, ${clubName}!`,
      intro: `Geweldig dat je De 12e Man hebt gekozen voor je vrijwilligersbeheer. Hier zijn je eerste 3 stappen:`,
      s1: `<strong>1. Maak je eerste evenement aan</strong> — Ga naar "Events" en klik op "+ Nieuw evenement".`,
      s2: `<strong>2. Nodig je eerste vrijwilliger uit</strong> — Ga naar "Leden" en deel de uitnodigingslink.`,
      s3: `<strong>3. Stel je eerste contract op</strong> — Ga naar "Contracten" → "Seizoenscontracten".`,
      cta: `Ga naar je dashboard`,
      footer: `Veel succes!<br/>Team De 12e Man`,
    },
    fr: {
      subject: `Bienvenue chez De 12e Man 👋`,
      heading: `Bienvenue, ${clubName} !`,
      intro: `Super que vous ayez choisi De 12e Man pour la gestion de vos bénévoles. Voici vos 3 premières étapes :`,
      s1: `<strong>1. Créez votre premier événement</strong> — Allez dans "Événements" et cliquez sur "+ Nouvel événement".`,
      s2: `<strong>2. Invitez votre premier bénévole</strong> — Allez dans "Membres" et partagez le lien d'invitation.`,
      s3: `<strong>3. Créez votre premier contrat</strong> — Allez dans "Contrats" → "Contrats de saison".`,
      cta: `Aller au tableau de bord`,
      footer: `Bonne chance !<br/>L'équipe De 12e Man`,
    },
    en: {
      subject: `Welcome to De 12e Man 👋`,
      heading: `Welcome, ${clubName}!`,
      intro: `Great that you chose De 12e Man for your volunteer management. Here are your first 3 steps:`,
      s1: `<strong>1. Create your first event</strong> — Go to "Events" and click "+ New event".`,
      s2: `<strong>2. Invite your first volunteer</strong> — Go to "Members" and share the invitation link.`,
      s3: `<strong>3. Set up your first contract</strong> — Go to "Contracts" → "Season contracts".`,
      cta: `Go to your dashboard`,
      footer: `Good luck!<br/>Team De 12e Man`,
    },
  };
  const c = t[lang];
  return {
    subject: c.subject,
    html: emailWrapper(c.heading, `
      <p>${c.intro}</p>
      <ul style="padding-left:20px;line-height:2">
        <li>${c.s1}</li>
        <li>${c.s2}</li>
        <li>${c.s3}</li>
      </ul>
      ${ctaButton(c.cta, `${APP_URL}/club-dashboard`)}
      <p style="margin-top:24px;color:#888">${c.footer}</p>
    `),
  };
}

function step2(lang: Lang, clubName: string): EmailContent {
  const t = {
    nl: {
      subject: `💡 Tip: maak je eerste seizoenscontract aan`,
      heading: `Nog geen contract, ${clubName}?`,
      body: `Met een seizoenscontract leg je afspraken met je vrijwilligers officieel vast. Het is snel, digitaal en juridisch conform de Belgische vrijwilligerswet.`,
      cta: `Maak een contract aan`,
      footer: `Tip: de eerste 2 contracttypes zijn gratis!`,
    },
    fr: {
      subject: `💡 Astuce : créez votre premier contrat de saison`,
      heading: `Pas encore de contrat, ${clubName} ?`,
      body: `Avec un contrat de saison, vous formalisez les accords avec vos bénévoles. C'est rapide, numérique et conforme à la loi belge sur le volontariat.`,
      cta: `Créer un contrat`,
      footer: `Astuce : les 2 premiers types de contrat sont gratuits !`,
    },
    en: {
      subject: `💡 Tip: create your first season contract`,
      heading: `No contract yet, ${clubName}?`,
      body: `With a season contract, you formally set up agreements with your volunteers. It's fast, digital and compliant with Belgian volunteer law.`,
      cta: `Create a contract`,
      footer: `Tip: the first 2 contract types are free!`,
    },
  };
  const c = t[lang];
  return {
    subject: c.subject,
    html: emailWrapper(c.heading, `
      <p>${c.body}</p>
      ${ctaButton(c.cta, `${APP_URL}/season-contracts`)}
      <p style="margin-top:24px;color:#888">${c.footer}</p>
    `),
  };
}

function step3(lang: Lang, clubName: string): EmailContent {
  const t = {
    nl: {
      subject: `🚀 Haal het meeste uit De 12e Man`,
      heading: `Tips voor ${clubName}`,
      body: `Wist je dat je ook briefings kunt maken, veiligheidsplannen kunt activeren en trainingen kunt aanbieden aan je vrijwilligers? Ontdek alle mogelijkheden in ons hulpcentrum.`,
      cta: `Bekijk het hulpcentrum`,
      footer: `Vragen? Mail ons op privacy@de12eman.be`,
    },
    fr: {
      subject: `🚀 Tirez le meilleur parti de De 12e Man`,
      heading: `Conseils pour ${clubName}`,
      body: `Saviez-vous que vous pouvez aussi créer des briefings, activer des plans de sécurité et proposer des formations à vos bénévoles ? Découvrez toutes les possibilités dans notre centre d'aide.`,
      cta: `Voir le centre d'aide`,
      footer: `Des questions ? Écrivez-nous à privacy@de12eman.be`,
    },
    en: {
      subject: `🚀 Get the most out of De 12e Man`,
      heading: `Tips for ${clubName}`,
      body: `Did you know you can also create briefings, activate safety plans and offer trainings to your volunteers? Discover all features in our help center.`,
      cta: `View the help center`,
      footer: `Questions? Email us at privacy@de12eman.be`,
    },
  };
  const c = t[lang];
  return {
    subject: c.subject,
    html: emailWrapper(c.heading, `
      <p>${c.body}</p>
      ${ctaButton(c.cta, `${APP_URL}/club-help`)}
      <p style="margin-top:24px;color:#888">${c.footer}</p>
    `),
  };
}

function emailWrapper(heading: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#1a1a2e;padding:24px 32px;text-align:center">
  <h1 style="color:#fff;margin:0;font-size:22px">De 12e Man</h1>
</td></tr>
<tr><td style="padding:32px">
  <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e">${heading}</h2>
  ${body}
</td></tr>
<tr><td style="padding:16px 32px;background:#f9f9fb;text-align:center;font-size:12px;color:#999">
  © ${new Date().getFullYear()} De 12e Man · <a href="${APP_URL}/privacy" style="color:#999">Privacy</a>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

function ctaButton(label: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="display:inline-block;padding:12px 32px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a>
  </div>`;
}

const stepGenerators: Record<number, (lang: Lang, name: string) => EmailContent> = {
  1: step1,
  2: step2,
  3: step3,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'De 12e Man <noreply@de12eman.be>';

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending emails that are due
    const { data: pendingEmails, error: fetchErr } = await supabase
      .from('club_onboarding_emails')
      .select('id, club_id, email_step, scheduled_for')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending onboarding emails', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gather club IDs
    const clubIds = [...new Set(pendingEmails.map((e: any) => e.club_id))];

    // Get club details + owner profiles for language detection
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name, owner_id')
      .in('id', clubIds);

    const ownerIds = [...new Set((clubs || []).map((c: any) => c.owner_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, language')
      .in('id', ownerIds);

    const clubMap = new Map((clubs || []).map((c: any) => [c.id, c]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      const club = clubMap.get(email.club_id);
      if (!club) {
        await supabase.from('club_onboarding_emails').update({ status: 'failed' }).eq('id', email.id);
        failed++;
        continue;
      }

      const profile = profileMap.get(club.owner_id);
      if (!profile?.email) {
        await supabase.from('club_onboarding_emails').update({ status: 'failed' }).eq('id', email.id);
        failed++;
        continue;
      }

      const lang: Lang = (['nl', 'fr', 'en'].includes(profile.language) ? profile.language : 'nl') as Lang;
      const generator = stepGenerators[email.email_step];
      if (!generator) {
        await supabase.from('club_onboarding_emails').update({ status: 'failed' }).eq('id', email.id);
        failed++;
        continue;
      }

      // For step 2: skip if club already has contracts
      if (email.email_step === 2) {
        const { count } = await supabase
          .from('season_contracts')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', email.club_id);

        if (count && count > 0) {
          // Club already has contracts — mark as sent (no need to send)
          await supabase.from('club_onboarding_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);
          sent++;
          continue;
        }
      }

      const { subject, html } = generator(lang, club.name);

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [profile.email],
            subject,
            html,
          }),
        });

        if (resendRes.ok) {
          await supabase.from('club_onboarding_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);
          sent++;
          console.log(`Onboarding step ${email.email_step} sent to ${profile.email} (${club.name})`);
        } else {
          const errBody = await resendRes.text();
          console.error(`Resend error for ${profile.email}:`, errBody);
          await supabase.from('club_onboarding_emails').update({ status: 'failed' }).eq('id', email.id);
          failed++;
        }
      } catch (sendErr) {
        console.error(`Send error for ${profile.email}:`, sendErr);
        await supabase.from('club_onboarding_emails').update({ status: 'failed' }).eq('id', email.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: pendingEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Onboarding emails error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
