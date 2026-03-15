import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUSEAL_API_URL = "https://api.docuseal.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DOCUSEAL_API_KEY = Deno.env.get("DOCUSEAL_API_KEY");
  if (!DOCUSEAL_API_KEY) {
    return new Response(JSON.stringify({ error: "DOCUSEAL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { membership_id, volunteer_id, club_id } = body;

    if (!membership_id || !volunteer_id || !club_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: membership_id, volunteer_id, club_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Auto-send season contract for:", { membership_id, volunteer_id, club_id });

    // 1. Find active season for this club
    const { data: season } = await adminClient
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("club_id", club_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!season) {
      console.log("No active season found for club", club_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_active_season" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if a season_contract already exists for this volunteer+season
    const { data: existingContract } = await adminClient
      .from("season_contracts")
      .select("id, status")
      .eq("volunteer_id", volunteer_id)
      .eq("season_id", season.id)
      .in("status", ["pending", "sent", "signed"])
      .limit(1)
      .maybeSingle();

    if (existingContract) {
      console.log("Contract already exists:", existingContract.id, existingContract.status);
      return new Response(JSON.stringify({ skipped: true, reason: "contract_exists", contract_id: existingContract.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get contract types for this membership
    const { data: contractTypes } = await adminClient
      .from("member_contract_types")
      .select("contract_type")
      .eq("membership_id", membership_id);

    const typeKeys = (contractTypes || []).map((ct: any) => ct.contract_type);
    console.log("Volunteer contract types:", typeKeys);

    // 4. Find matching season_contract_template
    // Priority: match by contract type category, fallback to first available
    const { data: templates } = await adminClient
      .from("season_contract_templates")
      .select("id, name, category, docuseal_template_id")
      .or(`club_id.eq.${club_id},is_system.eq.true`);

    let template = null;
    if (templates && templates.length > 0) {
      // Try to match by contract type
      if (typeKeys.length > 0) {
        template = templates.find((t: any) => typeKeys.includes(t.category));
      }
      // Fallback to first template
      if (!template) {
        template = templates[0];
      }
    }

    if (!template) {
      console.log("No season contract template found for club", club_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Using template:", template.id, template.name);

    // 5. Get volunteer profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email, phone, bank_iban, bank_holder_name")
      .eq("id", volunteer_id)
      .maybeSingle();

    let email = profile?.email;
    if (!email) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(volunteer_id);
      email = authUser?.user?.email;
    }

    if (!email) {
      console.log("No email found for volunteer", volunteer_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Get club info
    const { data: club } = await adminClient
      .from("clubs")
      .select("name, location, sport")
      .eq("id", club_id)
      .maybeSingle();

    const volunteerName = profile?.full_name || email;

    // 7. Build HTML contract
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;">
        <h1 style="text-align:center;color:#1a1a1a;">Seizoensovereenkomst – ${template.name}</h1>
        <p style="text-align:center;color:#6b7280;font-style:italic;">Conform de Wet van 3 juli 2005 betreffende de rechten van vrijwilligers<br/>Verhoogd plafond sportvrijwilligers: €3.233,91/jaar</p>
        <hr/>
        <h2>1. Partijen</h2>
        <p><strong>Organisatie:</strong> ${club?.name || 'Club'} ${club?.location ? ` – ${club.location}` : ''}</p>
        <p><strong>Vrijwilliger:</strong> ${volunteerName}</p>
        ${profile?.email ? `<p><strong>E-mail:</strong> ${profile.email}</p>` : ''}
        ${profile?.phone ? `<p><strong>Telefoon:</strong> ${profile.phone}</p>` : ''}
        ${profile?.bank_iban ? `<p><strong>IBAN:</strong> ${profile.bank_iban}</p>` : ''}
        <hr/>
        <h2>2. Seizoen</h2>
        <p><strong>Seizoen:</strong> ${season.name}</p>
        <p><strong>Looptijd:</strong> ${new Date(season.start_date).toLocaleDateString('nl-BE')} t.e.m. ${new Date(season.end_date).toLocaleDateString('nl-BE')}</p>
        <hr/>
        <h2>3. Rol</h2>
        <p><strong>Functie:</strong> ${template.name}</p>
        <p><strong>Categorie:</strong> ${template.category}</p>
        <hr/>
        <h2>4. Proefperiode</h2>
        <p>De eerste 3 aanwezigheden gelden als proefperiode. Vanaf de 4e aanwezigheid treedt het volledige contract in werking.</p>
        <hr/>
        <h2>5. Kostenvergoeding</h2>
        <p>De vrijwilliger heeft recht op een kostenvergoeding conform het Koninklijk Besluit. Het maximale jaarplafond bedraagt €3.233,91 (sportvrijwilligers).</p>
        <hr/>
        <h2>6. Slotbepalingen</h2>
        <p>Dit contract wordt beheerst door het Belgisch recht.</p>
        <br/><br/>
        <p>Opgemaakt op ${new Date().toLocaleDateString('nl-BE')}</p>
        <br/><br/>
        <p><strong>Handtekening vrijwilliger:</strong></p>
      </div>
    `;

    // 8. Create DocuSeal HTML template
    const createTemplateResp = await fetch(`${DOCUSEAL_API_URL}/templates/html`, {
      method: "POST",
      headers: { "X-Auth-Token": DOCUSEAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ html: htmlContent, name: `Seizoen ${template.name} - ${volunteerName}` }),
    });

    if (!createTemplateResp.ok) {
      const errText = await createTemplateResp.text();
      throw new Error(`DocuSeal template creation failed: ${errText}`);
    }

    const docuTemplate = await createTemplateResp.json();
    const docusealTemplateId = docuTemplate.id;

    // Add signature field
    const documentUuid = docuTemplate.documents?.[0]?.uuid;
    const submitterUuid = docuTemplate.submitters?.[0]?.uuid;
    const lastPage = Math.max(0, (docuTemplate.documents?.[0]?.pages?.length || 1) - 1);

    await fetch(`${DOCUSEAL_API_URL}/templates/${docusealTemplateId}`, {
      method: "PUT",
      headers: { "X-Auth-Token": DOCUSEAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: [{
          uuid: crypto.randomUUID(),
          submitter_uuid: submitterUuid,
          name: "Handtekening",
          type: "signature",
          required: true,
          areas: [{ attachment_uuid: documentUuid, page: lastPage, x: 0.1, y: 0.75, w: 0.35, h: 0.08 }],
        }],
      }),
    });

    // 9. Create DocuSeal submission
    const webhookUrl = `${supabaseUrl}/functions/v1/docuseal?action=webhook`;
    const submissionResp = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
      method: "POST",
      headers: { "X-Auth-Token": DOCUSEAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: docusealTemplateId,
        send_email: true,
        submitters: [{ email, name: volunteerName, role: docuTemplate.submitters?.[0]?.name || "First Party" }],
        webhook_url: webhookUrl,
      }),
    });

    const submissionData = await submissionResp.json();
    if (!submissionResp.ok) {
      throw new Error(`DocuSeal submission error: ${JSON.stringify(submissionData)}`);
    }

    const firstSubmitter = Array.isArray(submissionData) ? submissionData[0] : submissionData;
    const submissionId = firstSubmitter.submission_id || firstSubmitter.id;
    const signingUrl = firstSubmitter.embed_src || (firstSubmitter.slug ? `https://docuseal.com/s/${firstSubmitter.slug}` : null);

    // 10. Save to season_contracts
    const { error: dbError } = await adminClient.from("season_contracts").insert({
      club_id,
      season_id: season.id,
      template_id: template.id,
      volunteer_id,
      status: "sent",
      docuseal_submission_id: submissionId,
      signing_url: signingUrl,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    // 11. Notify volunteer
    await adminClient.from("notifications").insert({
      user_id: volunteer_id,
      title: "Seizoenscontract klaar",
      message: `Je seizoenscontract (${template.name}) is klaar om te ondertekenen.`,
      type: "contract_sent",
    });

    // Send push notification
    try {
      const pushUrl = `${supabaseUrl}/functions/v1/send-native-push`;
      await fetch(pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          user_id: volunteer_id,
          title: '📝 Seizoenscontract klaar',
          message: `Je seizoenscontract (${template.name}) is klaar om te ondertekenen.`,
          url: '/dashboard',
          type: 'contract_sent',
        }),
      });
    } catch (e) { console.warn('Push failed:', e); }

    console.log("Auto-sent season contract:", submissionId, "for volunteer:", volunteer_id);

    return new Response(JSON.stringify({ success: true, contract_id: submissionId, signing_url: signingUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
