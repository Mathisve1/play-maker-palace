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
    return new Response(JSON.stringify({ error: "DOCUSEAL_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

  // Check if this is a webhook call (no auth required - comes from DocuSeal)
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "webhook") {
    // Webhook doesn't require auth - handle it directly with service role
    try {
      const body = await req.json();
      console.log("DocuSeal webhook received:", JSON.stringify(body));

      const { event_type, data: webhookData } = body;

      if (event_type === "form.completed" && webhookData) {
        const submissionId = webhookData.submission_id || webhookData.id;
        const documents = webhookData.documents || [];
        const documentUrl = documents.length > 0 ? documents[0].url : null;

        if (submissionId) {
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (serviceRoleKey) {
            const adminClient = createClient(supabaseUrl, serviceRoleKey);

            // Check season_contracts first (new flow)
            const { data: seasonContract } = await adminClient
              .from("season_contracts")
              .select("id, volunteer_id, club_id")
              .eq("docuseal_submission_id", submissionId)
              .maybeSingle();

            if (seasonContract) {
              const scUpdate: Record<string, unknown> = {
                status: "signed",
                signed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              if (documentUrl) scUpdate.document_url = documentUrl;

              await adminClient
                .from("season_contracts")
                .update(scUpdate)
                .eq("id", seasonContract.id);

              // Notify club owner
              const { data: club } = await adminClient.from("clubs").select("owner_id").eq("id", seasonContract.club_id).maybeSingle();
              if (club?.owner_id) {
                await adminClient.from("notifications").insert({
                  user_id: club.owner_id,
                  title: "Seizoenscontract ondertekend",
                  message: "Een vrijwilliger heeft het seizoenscontract ondertekend.",
                  type: "contract_signed",
                  metadata: { season_contract_id: seasonContract.id },
                });
                try {
                  const pushUrl = `${supabaseUrl}/functions/v1/send-native-push`;
                  await fetch(pushUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
                    body: JSON.stringify({ user_id: club.owner_id, title: '📝 Seizoenscontract ondertekend', message: 'Een vrijwilliger heeft het seizoenscontract ondertekend.', url: '/volunteer-management', type: 'contract_signed' }),
                  });
                } catch (e) { console.warn('Push failed:', e); }
              }

              // Also notify the volunteer
              await adminClient.from("notifications").insert({
                user_id: seasonContract.volunteer_id,
                title: "Contract ondertekend",
                message: "Je seizoenscontract is succesvol ondertekend.",
                type: "contract_signed",
              });

              console.log("Webhook: Updated season_contract", seasonContract.id, "to signed");
            } else {
              // Fallback: check signature_requests (old flow)
            const { data: sigReq } = await adminClient
              .from("signature_requests")
              .select("id, volunteer_id, club_owner_id, task_id")
              .eq("docuseal_submission_id", submissionId)
              .maybeSingle();

            if (sigReq) {
              const updatePayload: Record<string, unknown> = {
                status: "completed",
                updated_at: new Date().toISOString(),
              };
              if (documentUrl) {
                updatePayload.document_url = documentUrl;
              }

              await adminClient
                .from("signature_requests")
                .update(updatePayload)
                .eq("id", sigReq.id);

              // Notify the club owner (in-app)
              await adminClient.from("notifications").insert({
                user_id: sigReq.club_owner_id,
                title: "Contract ondertekend",
                message: "Een vrijwilliger heeft het contract ondertekend.",
                type: "contract_signed",
                metadata: { task_id: sigReq.task_id, signature_request_id: sigReq.id },
              });

              // Send push notification to club owner
              try {
                const pushUrl = `${supabaseUrl}/functions/v1/send-native-push`;
                await fetch(pushUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
                  body: JSON.stringify({
                    user_id: sigReq.club_owner_id,
                    title: '📝 Contract ondertekend',
                    message: 'Een vrijwilliger heeft het contract ondertekend.',
                    url: '/command-center',
                    type: 'contract_signed',
                  }),
                });
              } catch (e) { console.warn('Push notification failed:', e); }

              console.log("Webhook: Updated signature request", sigReq.id, "to completed, document_url:", documentUrl);
            } else {
              // Check if it's a compliance declaration
              const { data: compDecl } = await adminClient
                .from("compliance_declarations")
                .select("id, volunteer_id")
                .eq("docuseal_submission_id", submissionId)
                .maybeSingle();
              
              if (compDecl) {
                const declUpdate: Record<string, unknown> = {
                  signature_status: "completed",
                  updated_at: new Date().toISOString(),
                };
                if (documentUrl) declUpdate.document_url = documentUrl;
                
                await adminClient
                  .from("compliance_declarations")
                  .update(declUpdate)
                  .eq("id", compDecl.id);
                
                console.log("Webhook: Updated compliance declaration", compDecl.id, "to completed");
              } else {
                // Check if it's a SEPA batch signing
                const { data: sepaBatch } = await adminClient
                  .from("sepa_batches")
                  .select("id, club_id")
                  .eq("docuseal_submission_id", submissionId)
                  .maybeSingle();

                if (sepaBatch) {
                  await adminClient
                    .from("sepa_batches")
                    .update({
                      status: "signed",
                      docuseal_document_url: documentUrl,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", sepaBatch.id);

                  // Update all batch items to sent_to_bank
                  await adminClient
                    .from("sepa_batch_items")
                    .update({ status: "sent_to_bank" })
                    .eq("batch_id", sepaBatch.id);

                  console.log("Webhook: Updated SEPA batch", sepaBatch.id, "to signed");

                  // Send notification emails to volunteers
                  const resendApiKey = Deno.env.get("RESEND_API_KEY");
                  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
                  if (resendApiKey && resendFromEmail) {
                    const { data: items } = await adminClient
                      .from("sepa_batch_items")
                      .select("volunteer_id, amount")
                      .eq("batch_id", sepaBatch.id);

                    if (items && items.length > 0) {
                      const volunteerIds = items.map((i: { volunteer_id: string }) => i.volunteer_id);
                      const { data: profiles } = await adminClient
                        .from("profiles")
                        .select("id, email, full_name")
                        .in("id", volunteerIds);

                      const { data: club } = await adminClient
                        .from("clubs")
                        .select("name")
                        .eq("id", sepaBatch.club_id)
                        .single();

                      for (const profile of (profiles || [])) {
                        if (!profile.email) continue;
                        const item = items.find((i: { volunteer_id: string }) => i.volunteer_id === profile.id);
                        const amount = item ? Number(item.amount).toFixed(2) : "0.00";

                        try {
                          await fetch("https://api.resend.com/emails", {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${resendApiKey}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              from: resendFromEmail,
                              to: [profile.email],
                              subject: `Uitbetaling klaargezet - €${amount}`,
                              html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                  <h2>Goed nieuws, ${profile.full_name || "vrijwilliger"}! 🎉</h2>
                                  <p>Je onkostenvergoeding van <strong>€${amount}</strong> is door ${club?.name || "de club"} klaargezet voor de bank.</p>
                                  <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0;">
                                    <p style="margin: 0; color: #71717a; font-size: 14px;">
                                      ⏳ <strong>Let op:</strong> Het kan tot <strong>7 werkdagen</strong> duren voordat het bedrag op je rekening staat.
                                    </p>
                                  </div>
                                  <p style="color: #71717a; font-size: 13px;">Dit is een automatisch bericht.</p>
                                </div>
                              `,
                            }),
                          });
                        } catch (emailErr) {
                          console.error("Email send error:", emailErr);
                        }

                        // Create in-app notification
                        await adminClient.from("notifications").insert({
                          user_id: profile.id,
                          title: "Uitbetaling klaargezet",
                          message: `Je onkostenvergoeding van €${amount} is klaargezet voor de bank. Het kan tot 7 werkdagen duren.`,
                          type: "payment_sent",
                        });
                      }
                    }
                  }
                } else {
                  console.log("Webhook: No matching signature request, compliance declaration, or SEPA batch for submission", submissionId);
                }
              }
            }
            } // close seasonContract else
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Auth check for all non-webhook actions
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Supabase key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET templates
    if (req.method === "GET" && action === "templates") {
      const resp = await fetch(`${DOCUSEAL_API_URL}/templates`, {
        headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DocuSeal API error [${resp.status}]: ${JSON.stringify(data)}`);
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET submission status
    if (req.method === "GET" && action === "submission") {
      const submissionId = url.searchParams.get("id");
      if (!submissionId) {
        return new Response(JSON.stringify({ error: "Missing submission id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resp = await fetch(`${DOCUSEAL_API_URL}/submissions/${submissionId}`, {
        headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DocuSeal API error [${resp.status}]: ${JSON.stringify(data)}`);
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST create submission (send for signing)
    if (req.method === "POST" && action === "create-submission") {
      const body = await req.json();
      const { template_id, task_id, volunteer_id, volunteer_name } = body;
      let { volunteer_email } = body;

      console.log("create-submission body:", JSON.stringify({ template_id, task_id, volunteer_id, volunteer_email, volunteer_name }));

      if (!template_id || !task_id) {
        return new Response(JSON.stringify({ error: `Missing required fields: template_id=${template_id}, task_id=${task_id}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If volunteer_email is missing, look it up using service role to bypass RLS
      if (!volunteer_email && volunteer_id) {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
          const { data: volProfile } = await adminClient
            .from("profiles")
            .select("email")
            .eq("id", volunteer_id)
            .maybeSingle();
          if (volProfile?.email) {
            volunteer_email = volProfile.email;
          }
          // If still missing, try auth.users
          if (!volunteer_email) {
            const { data: authUser } = await adminClient.auth.admin.getUserById(volunteer_id);
            if (authUser?.user?.email) {
              volunteer_email = authUser.user.email;
            }
          }
        }
      }

      if (!volunteer_email) {
        return new Response(JSON.stringify({ error: "Volunteer email is missing. Please update the volunteer's profile with an email address." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up volunteer profile to get bank details
      const { data: volunteerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, bank_iban, bank_holder_name, bank_consent_given, bank_consent_date")
        .eq("email", volunteer_email)
        .maybeSingle();

      // Build pre-filled fields from volunteer data
      const prefilledFields: Record<string, string> = {};
      if (volunteerProfile) {
        if (volunteerProfile.full_name) prefilledFields["Naam"] = volunteerProfile.full_name;
        if (volunteerProfile.full_name) prefilledFields["Name"] = volunteerProfile.full_name;
        if (volunteerProfile.email) prefilledFields["Email"] = volunteerProfile.email;
        if (volunteerProfile.email) prefilledFields["E-mail"] = volunteerProfile.email;
        if (volunteerProfile.phone) prefilledFields["Telefoon"] = volunteerProfile.phone;
        if (volunteerProfile.phone) prefilledFields["Phone"] = volunteerProfile.phone;
        if (volunteerProfile.bank_iban) prefilledFields["IBAN"] = volunteerProfile.bank_iban;
        if (volunteerProfile.bank_iban) prefilledFields["Rekeningnummer"] = volunteerProfile.bank_iban;
        if (volunteerProfile.bank_iban) prefilledFields["Bank Account"] = volunteerProfile.bank_iban;
        if (volunteerProfile.bank_holder_name) prefilledFields["Rekeninghouder"] = volunteerProfile.bank_holder_name;
        if (volunteerProfile.bank_holder_name) prefilledFields["Account Holder"] = volunteerProfile.bank_holder_name;
      }

      // Also fetch task details for pre-filling
      const { data: taskData } = await supabase
        .from("tasks")
        .select("title, task_date, location, start_time, end_time, briefing_time, briefing_location, description, notes, expense_amount, expense_reimbursement")
        .eq("id", task_id)
        .maybeSingle();

      // Fetch club info
      const { data: clubData } = taskData ? await supabase
        .from("tasks")
        .select("clubs(name, location, sport)")
        .eq("id", task_id)
        .maybeSingle() : { data: null };

      const club = (clubData as any)?.clubs;
      if (club) {
        if (club.name) {
          prefilledFields["Club"] = club.name;
          prefilledFields["Clubnaam"] = club.name;
          prefilledFields["Organization"] = club.name;
        }
      }

      const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
      };
      const formatDateNL = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
      };

      if (taskData) {
        if (taskData.title) {
          prefilledFields["Taak"] = taskData.title;
          prefilledFields["Task"] = taskData.title;
          prefilledFields["Opdracht"] = taskData.title;
        }
        if (taskData.description) {
          prefilledFields["Beschrijving"] = taskData.description;
          prefilledFields["Description"] = taskData.description;
        }
        if (taskData.location) {
          prefilledFields["Locatie"] = taskData.location;
          prefilledFields["Location"] = taskData.location;
          prefilledFields["Werklocatie"] = taskData.location;
        }
        if (taskData.task_date) {
          prefilledFields["Datum"] = formatDateNL(taskData.task_date);
          prefilledFields["Date"] = formatDateNL(taskData.task_date);
        }
        if (taskData.start_time) {
          prefilledFields["Starttijd"] = formatTime(taskData.start_time);
          prefilledFields["Start Time"] = formatTime(taskData.start_time);
          prefilledFields["Aanvang"] = formatTime(taskData.start_time);
        }
        if (taskData.end_time) {
          prefilledFields["Eindtijd"] = formatTime(taskData.end_time);
          prefilledFields["End Time"] = formatTime(taskData.end_time);
        }
        if (taskData.start_time && taskData.end_time) {
          prefilledFields["Uren"] = `${formatTime(taskData.start_time)} - ${formatTime(taskData.end_time)}`;
          prefilledFields["Hours"] = `${formatTime(taskData.start_time)} - ${formatTime(taskData.end_time)}`;
          prefilledFields["Werkuren"] = `${formatTime(taskData.start_time)} - ${formatTime(taskData.end_time)}`;
        }
        if (taskData.briefing_time) {
          prefilledFields["Briefing tijd"] = formatTime(taskData.briefing_time);
          prefilledFields["Briefing Time"] = formatTime(taskData.briefing_time);
        }
        if (taskData.briefing_location) {
          prefilledFields["Briefing locatie"] = taskData.briefing_location;
          prefilledFields["Briefing Location"] = taskData.briefing_location;
          prefilledFields["Verzamelplaats"] = taskData.briefing_location;
        }
        if (taskData.notes) {
          prefilledFields["Notities"] = taskData.notes;
          prefilledFields["Notes"] = taskData.notes;
        }
        if (taskData.expense_reimbursement && taskData.expense_amount) {
          prefilledFields["Onkostenvergoeding"] = `€${taskData.expense_amount}`;
          prefilledFields["Expense Amount"] = `€${taskData.expense_amount}`;
          prefilledFields["Vergoeding"] = `€${taskData.expense_amount}`;
        }
      }

      // Always ensure Datum is set (fallback to today)
      if (!prefilledFields["Datum"]) {
        prefilledFields["Datum"] = new Date().toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
        prefilledFields["Date"] = prefilledFields["Datum"];
      }

      // Fetch template fields from DocuSeal to only send matching ones
      const templateResp = await fetch(`${DOCUSEAL_API_URL}/templates/${Number(template_id)}`, {
        headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
      });
      const templateData = await templateResp.json();
      if (!templateResp.ok) {
        throw new Error(`DocuSeal API error [${templateResp.status}]: ${JSON.stringify(templateData)}`);
      }

      // Get field names that actually exist in the template
      const templateFieldNames = new Set<string>();
      if (templateData.fields && Array.isArray(templateData.fields)) {
        templateData.fields.forEach((f: any) => {
          if (f.name) templateFieldNames.add(f.name);
        });
      }

      console.log("Template fields:", [...templateFieldNames]);

      // If template has NO fields, add default fields via PUT before creating submission
      if (templateFieldNames.size === 0) {
        console.log("Template has no fields, adding default fields via PUT...");
        const defaultFields = [
          { name: "Naam", type: "text", role: "First Party" },
          { name: "Email", type: "text", role: "First Party" },
          { name: "Datum", type: "text", role: "First Party" },
          { name: "Locatie", type: "text", role: "First Party" },
          { name: "Taak", type: "text", role: "First Party" },
          { name: "Uren", type: "text", role: "First Party" },
          { name: "Onkostenvergoeding", type: "text", role: "First Party" },
          { name: "IBAN", type: "text", role: "First Party" },
          { name: "Rekeninghouder", type: "text", role: "First Party" },
          { name: "Handtekening", type: "signature", role: "First Party",
            areas: [{ attachment_uuid: templateData.documents?.[0]?.uuid, page: Math.max(0, (templateData.documents?.[0]?.pages?.length || 1) - 1), x: 0.55, y: 0.85, w: 0.35, h: 0.06 }] },
        ];
        const putResp = await fetch(`${DOCUSEAL_API_URL}/templates/${Number(template_id)}`, {
          method: "PUT",
          headers: {
            "X-Auth-Token": DOCUSEAL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields: defaultFields }),
        });
        const putData = await putResp.json();
        console.log("PUT template fields result:", putResp.status, JSON.stringify(putData?.fields?.map((f: any) => f.name)));
        if (putResp.ok && putData.fields) {
          putData.fields.forEach((f: any) => {
            if (f.name) templateFieldNames.add(f.name);
          });
        }
      }

      // Build values object — only include fields that exist in the template
      const values: Record<string, string> = {};
      for (const [name, val] of Object.entries(prefilledFields)) {
        if (templateFieldNames.has(name)) {
          values[name] = val;
        }
      }

      console.log("Sending prefilled values:", JSON.stringify(values));

      // Determine the submitter role from the template
      const submitterRole = templateData.submitters?.[0]?.name || "First Party";

      // Build submitter object using 'values' (simpler key-value format)
      const submitter: Record<string, unknown> = {
        email: volunteer_email,
        name: volunteer_name || volunteerProfile?.full_name || undefined,
        role: submitterRole,
        values,
      };

      // Build webhook URL so DocuSeal notifies us when signing completes
      const webhookUrl = `${supabaseUrl}/functions/v1/docuseal?action=webhook`;

      // Create DocuSeal submission
      const resp = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: Number(template_id),
          send_email: true,
          submitters: [submitter],
          webhook_url: webhookUrl,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DocuSeal API error [${resp.status}]: ${JSON.stringify(data)}`);
      }

      // data is an array of submitters
      const submission = Array.isArray(data) ? data[0] : data;
      const submissionId = submission.submission_id || submission.id;
      const signingUrl = submission.embed_src
        || (submission.slug ? `https://docuseal.com/s/${submission.slug}` : null);

      // Save to our DB
      const { error: dbError } = await supabase.from("signature_requests").insert({
        task_id,
        volunteer_id: volunteerProfile?.id || userId,
        club_owner_id: userId,
        docuseal_submission_id: submissionId,
        status: "pending",
        signing_url: signingUrl,
      });

      if (dbError) {
        console.error("DB insert error:", dbError);
      }

      return new Response(JSON.stringify({ success: true, submission: submission, submission_id: submissionId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST create template from PDF
    if (req.method === "POST" && action === "create-template-from-pdf") {
      const body = await req.json();
      const { name, file_url, club_id, file_path: storagePath, template_data, template_id: existingTemplateId } = body;

      if (!name || !file_url || !club_id) {
        return new Response(JSON.stringify({ error: "Missing required fields: name, file_url, club_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Standard fields that will be auto-filled from volunteer profiles and task data
      // Note: These are no longer needed as fields are defined via text tags in the PDF
      // DocuSeal auto-detects {{FieldName;role=...;type=...}} text tags

      // Send the URL directly to DocuSeal instead of downloading + base64 encoding
      const resp = await fetch(`${DOCUSEAL_API_URL}/templates/pdf`, {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          documents: [{
            name: "contract.pdf",
            file: file_url,
          }],
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DocuSeal API error [${resp.status}]: ${JSON.stringify(data)}`);
      }

      const docusealTemplateId = data.id;
      const detectedFields = data.fields?.map((f: any) => f.name) || [];
      console.log("Created DocuSeal template:", docusealTemplateId, "Fields:", JSON.stringify(detectedFields));

      // If no fields were detected, add default fields via PUT
      if (detectedFields.length === 0) {
        console.log("No fields detected, adding defaults via PUT...");
        const putResp = await fetch(`${DOCUSEAL_API_URL}/templates/${docusealTemplateId}`, {
          method: "PUT",
          headers: { "X-Auth-Token": DOCUSEAL_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [
              { name: "Naam", type: "text", role: "First Party" },
              { name: "Email", type: "text", role: "First Party" },
              { name: "Datum", type: "text", role: "First Party" },
              { name: "Locatie", type: "text", role: "First Party" },
              { name: "Taak", type: "text", role: "First Party" },
              { name: "Uren", type: "text", role: "First Party" },
              { name: "Onkostenvergoeding", type: "text", role: "First Party" },
          { name: "Handtekening", type: "signature", role: "First Party",
            areas: [{ attachment_uuid: data.documents?.[0]?.uuid, page: Math.max(0, (data.documents?.[0]?.pages?.length || 1) - 1), x: 0.55, y: 0.85, w: 0.35, h: 0.06 }] },
        ],
      }),
    });
    console.log("PUT fields status:", putResp.status);
  }

      let templateRecord;

      if (existingTemplateId) {
        // Update existing template
        const { data: updated, error: dbError } = await supabase
          .from("contract_templates")
          .update({
            name,
            docuseal_template_id: docusealTemplateId,
            file_path: storagePath || null,
            template_data: template_data || null,
          })
          .eq("id", existingTemplateId)
          .select()
          .single();

        if (dbError) {
          console.error("DB update error:", dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }
        templateRecord = updated;
      } else {
        // Insert new template
        const { data: inserted, error: dbError } = await supabase
          .from("contract_templates")
          .insert({
            club_id,
            name,
            docuseal_template_id: docusealTemplateId,
            created_by: userId,
            file_path: storagePath || null,
            template_data: template_data || null,
          })
          .select()
          .single();

        if (dbError) {
          console.error("DB insert error:", dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }
        templateRecord = inserted;
      }

      return new Response(JSON.stringify({ success: true, template: templateRecord }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE template
    if (req.method === "POST" && action === "delete-template") {
      const body = await req.json();
      const { template_id } = body;

      if (!template_id) {
        return new Response(JSON.stringify({ error: "Missing template_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the template record first
      const { data: template, error: fetchError } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("id", template_id)
        .single();

      if (fetchError || !template) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Unlink tasks that reference this template before deleting
      const { error: unlinkError } = await supabase
        .from("tasks")
        .update({ contract_template_id: null })
        .eq("contract_template_id", template_id);

      if (unlinkError) {
        console.error("Unlink tasks error:", unlinkError);
      }

      // Delete from DocuSeal
      try {
        await fetch(`${DOCUSEAL_API_URL}/templates/${template.docuseal_template_id}`, {
          method: "DELETE",
          headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
        });
      } catch (e) {
        console.error("DocuSeal delete error (continuing):", e);
      }

      // Delete from our DB
      const { error: dbError } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", template_id);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST check-status: poll DocuSeal for submission status and update document_url
    if (req.method === "POST" && action === "check-status") {
      const body = await req.json();
      const { signature_request_id } = body;

      if (!signature_request_id) {
        return new Response(JSON.stringify({ error: "Missing signature_request_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the signature request
      const { data: sigReq, error: sigError } = await supabase
        .from("signature_requests")
        .select("*")
        .eq("id", signature_request_id)
        .single();

      if (sigError || !sigReq) {
        return new Response(JSON.stringify({ error: "Signature request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!sigReq.docuseal_submission_id) {
        return new Response(JSON.stringify({ error: "No DocuSeal submission ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch submission from DocuSeal
      const resp = await fetch(`${DOCUSEAL_API_URL}/submissions/${sigReq.docuseal_submission_id}`, {
        headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DocuSeal API error [${resp.status}]: ${JSON.stringify(data)}`);
      }

      // Check if all submitters have completed
      const submitters = data.submitters || [];
      const allCompleted = submitters.length > 0 && submitters.every((s: any) => s.status === "completed");

      // Get document URLs from completed submitters
      let documentUrl: string | null = null;
      if (allCompleted) {
        // Find the document from the last completed submitter
        for (const submitter of submitters) {
          if (submitter.documents && submitter.documents.length > 0) {
            documentUrl = submitter.documents[0].url;
          }
        }
      }

      // Determine new status
      const newStatus = allCompleted ? "completed" : "pending";

      // Update our DB
      const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (documentUrl) {
        updateData.document_url = documentUrl;
      }

      const { error: updateError } = await supabase
        .from("signature_requests")
        .update(updateData)
        .eq("id", signature_request_id);

      if (updateError) {
        console.error("Update error:", updateError);
      }

      return new Response(JSON.stringify({
        success: true,
        status: newStatus,
        document_url: documentUrl,
        submission: data,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // POST send-personalized-contract: Create DocuSeal template from personalized PDF + submission
    if (req.method === "POST" && action === "send-personalized-contract") {
      const body = await req.json();
      const { pdf_url, task_id, volunteer_id, volunteer_email, volunteer_name, signature_position } = body;

      console.log("send-personalized-contract:", JSON.stringify({ task_id, volunteer_id, volunteer_email }));

      if (!pdf_url || !task_id || !volunteer_email) {
        return new Response(JSON.stringify({ error: "Missing required fields: pdf_url, task_id, volunteer_email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // STEP 1: Create a template from the personalized PDF
      const templateResp = await fetch(`${DOCUSEAL_API_URL}/templates/pdf`, {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Contract ${volunteer_name || volunteer_email} - ${new Date().toISOString().slice(0, 10)}`,
          documents: [{ name: "contract.pdf", file: pdf_url }],
        }),
      });

      const templateData = await templateResp.json();
      console.log("Step 1 - Template created:", templateResp.status, "id:", templateData?.id, "fields:", JSON.stringify(templateData?.fields?.map((f: any) => f.name)));

      if (!templateResp.ok) {
        throw new Error(`DocuSeal template creation error [${templateResp.status}]: ${JSON.stringify(templateData)}`);
      }

      const docusealTemplateId = templateData.id;

      // STEP 2: Add signature field to the template via PUT with exact position on last page
      const lastPage = Math.max(0, (templateData.documents?.[0]?.pages?.length || 1) - 1);
      const documentUuid = templateData.documents?.[0]?.uuid;

      // Determine the submitter role and submitter_uuid from the template
      const submitterUuid = templateData.submitters?.[0]?.uuid;
      const templateRole = templateData.submitters?.[0]?.name || "First Party";
      console.log("Step 2 - Using role:", templateRole, "lastPage:", lastPage, "documentUuid:", documentUuid, "submitterUuid:", submitterUuid);

      if (!submitterUuid) {
        console.error("Step 2 - CRITICAL: No submitter_uuid found in template response. Template submitters:", JSON.stringify(templateData.submitters));
      }
      if (!documentUuid) {
        console.error("Step 2 - CRITICAL: No document uuid found. Template documents:", JSON.stringify(templateData.documents));
      }

      const fieldUuid = crypto.randomUUID();
      // Use dynamic signature position if provided, otherwise fall back to defaults
      const sigPage = signature_position?.page ?? lastPage;
      const sigX = signature_position?.x ?? 0.56;
      const sigY = signature_position?.y ?? 0.78;
      console.log("Step 2 - Signature position:", JSON.stringify({ sigPage, sigX, sigY, fromClient: !!signature_position }));

      const fieldsToSet = [
        {
          uuid: fieldUuid,
          submitter_uuid: submitterUuid,
          name: "Handtekening",
          type: "signature",
          required: true,
          areas: [{
            attachment_uuid: documentUuid,
            page: sigPage,
            x: sigX,
            y: sigY,
            w: 0.30,
            h: 0.05,
          }],
        },
      ];

      console.log("Step 2 - PUT payload:", JSON.stringify({ fields: fieldsToSet }));

      const putResp = await fetch(`${DOCUSEAL_API_URL}/templates/${docusealTemplateId}`, {
        method: "PUT",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: fieldsToSet }),
      });

      const putData = await putResp.json();
      console.log("Step 2 - PUT response status:", putResp.status);
      console.log("Step 2 - PUT response fields:", JSON.stringify(putData?.fields?.map((f: any) => ({ name: f.name, type: f.type, uuid: f.uuid, submitter_uuid: f.submitter_uuid, areas: f.areas?.length }))));
      if (putData?.fields === undefined || (Array.isArray(putData?.fields) && putData.fields.length === 0)) {
        console.error("Step 2 - WARNING: PUT returned no fields! Full response:", JSON.stringify(putData).slice(0, 1000));
      }

      if (!putResp.ok) {
        console.error("PUT fields failed:", JSON.stringify(putData));
        // Continue anyway - submission might still work
      }

      // Build webhook URL so DocuSeal notifies us when signing completes
      const webhookUrl = `${supabaseUrl}/functions/v1/docuseal?action=webhook`;

      // STEP 3: Create submission using the template
      const submissionResp = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: docusealTemplateId,
          send_email: true,
          submitters: [{
            email: volunteer_email,
            name: volunteer_name || undefined,
            role: templateRole,
          }],
          webhook_url: webhookUrl,
        }),
      });

      const submissionData = await submissionResp.json();
      console.log("Step 3 - Submission response:", submissionResp.status, JSON.stringify(submissionData).slice(0, 500));

      if (!submissionResp.ok) {
        throw new Error(`DocuSeal submission error [${submissionResp.status}]: ${JSON.stringify(submissionData)}`);
      }

      // submissions returns an array of submitters
      const firstSubmitter = Array.isArray(submissionData) ? submissionData[0] : submissionData.submitters?.[0] || submissionData;
      const submissionId = firstSubmitter.submission_id || firstSubmitter.id || submissionData.id;
      const signingUrl = firstSubmitter.embed_src
        || (firstSubmitter.slug ? `https://docuseal.com/s/${firstSubmitter.slug}` : null);

      console.log("Created submission:", submissionId, "signing_url:", signingUrl);

      // Save to signature_requests
      const resolvedVolunteerId = volunteer_id || userId;
      const { error: dbError } = await supabase.from("signature_requests").insert({
        task_id,
        volunteer_id: resolvedVolunteerId,
        club_owner_id: userId,
        docuseal_submission_id: submissionId,
        status: "pending",
        signing_url: signingUrl,
      });

      if (dbError) {
        console.error("DB insert error:", dbError);
      }

      return new Response(JSON.stringify({ success: true, submission: submissionData, submission_id: submissionId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Sign compliance declaration ===
    if (action === "sign-compliance-declaration" && req.method === "POST") {
      const { declaration_id, month, year, external_income, external_hours } = await req.json();

      if (!declaration_id) {
        return new Response(JSON.stringify({ error: "declaration_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get volunteer profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const volunteerName = profile?.full_name || profile?.email || "Vrijwilliger";
      const volunteerEmail = profile?.email || `${user.id}@volunteer.local`;

      const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
      const monthLabel = monthNames[(month || 1) - 1];

      // Create a DocuSeal submission for compliance declaration
      try {
        // First, get available templates to find a compliance template
        const templatesResp = await fetch(`${DOCUSEAL_API_URL}/templates`, {
          headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
        });
        const templates = await templatesResp.json();
        
        // Look for a compliance template, or use the first available one
        let complianceTemplate = Array.isArray(templates) 
          ? templates.find((t: any) => t.name?.toLowerCase().includes('compliance') || t.name?.toLowerCase().includes('verklaring'))
          : null;
        
        if (!complianceTemplate && Array.isArray(templates) && templates.length > 0) {
          complianceTemplate = templates[0];
        }

        if (!complianceTemplate) {
          // No templates available - create submission via HTML template
          const htmlContent = `
            <h2 style="text-align:center;">Verklaring op Eer</h2>
            <h3 style="text-align:center;">Externe Inkomsten & Uren in de Sportsector</h3>
            <br/>
            <p>Ondergetekende, <strong>${volunteerName}</strong>, verklaart op eer dat onderstaande gegevens correct zijn:</p>
            <br/>
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Maand</strong></td><td style="padding:8px; border:1px solid #ccc;">${monthLabel} ${year}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Extern verdiend bedrag</strong></td><td style="padding:8px; border:1px solid #ccc;">€ ${(external_income || 0).toFixed(2)}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Externe gewerkte uren</strong></td><td style="padding:8px; border:1px solid #ccc;">${external_hours || 0} uren</td></tr>
            </table>
            <br/>
            <p>Ik begrijp dat onjuiste informatie kan leiden tot RSZ-boetes conform de Belgische vrijwilligerswetgeving.</p>
            <br/>
            <p>Datum: ${new Date().toLocaleDateString('nl-BE')}</p>
            <br/><br/>
            <p><strong>Handtekening:</strong></p>
          `;

          // Create template from HTML
          const createTemplateResp = await fetch(`${DOCUSEAL_API_URL}/templates/html`, {
            method: "POST",
            headers: {
              "X-Auth-Token": DOCUSEAL_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              html: htmlContent,
              name: `Compliance Verklaring - ${monthLabel} ${year}`,
            }),
          });

          if (createTemplateResp.ok) {
            complianceTemplate = await createTemplateResp.json();
            console.log("Created compliance template:", complianceTemplate.id);
          } else {
            const errText = await createTemplateResp.text();
            console.error("Failed to create compliance template:", errText);
            return new Response(JSON.stringify({ 
              success: false, 
              signing_url: null,
              message: "Declaration saved but DocuSeal template creation failed",
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Ensure the template has a signature field - add via PUT if missing
        const templateFields = complianceTemplate.fields || [];
        const hasSignatureField = templateFields.some((f: any) => f.type === "signature");
        
        if (!hasSignatureField) {
          console.log("Template has no signature field, adding via PUT...");
          const documentUuid = complianceTemplate.documents?.[0]?.uuid;
          const submitterUuid = complianceTemplate.submitters?.[0]?.uuid;
          const lastPage = Math.max(0, (complianceTemplate.documents?.[0]?.pages?.length || 1) - 1);
          
          const fieldUuid = crypto.randomUUID();
          const putFieldsResp = await fetch(`${DOCUSEAL_API_URL}/templates/${complianceTemplate.id}`, {
            method: "PUT",
            headers: {
              "X-Auth-Token": DOCUSEAL_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: [
                {
                  uuid: fieldUuid,
                  submitter_uuid: submitterUuid,
                  name: "Handtekening",
                  type: "signature",
                  required: true,
                  areas: [{
                    attachment_uuid: documentUuid,
                    page: lastPage,
                    x: 0.1,
                    y: 0.75,
                    w: 0.35,
                    h: 0.08,
                  }],
                },
              ],
            }),
          });
          
          const putResult = await putFieldsResp.json();
          console.log("PUT signature field result:", putFieldsResp.status, "fields:", JSON.stringify(putResult?.fields?.map((f: any) => ({ name: f.name, type: f.type }))));
          
          if (!putFieldsResp.ok) {
            console.error("Failed to add signature field:", JSON.stringify(putResult));
            return new Response(JSON.stringify({ 
              success: false, 
              signing_url: null,
              message: "Failed to configure signature field",
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        const webhookUrl = `${supabaseUrl}/functions/v1/docuseal?action=webhook`;

        const submissionResp = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
          method: "POST",
          headers: {
            "X-Auth-Token": DOCUSEAL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: complianceTemplate.id,
            send_email: false,
            submitters: [
              {
                name: volunteerName,
                email: volunteerEmail,
                role: complianceTemplate.submitters?.[0]?.name || "First Party",
                values: {
                  naam: volunteerName,
                  maand: `${monthLabel} ${year}`,
                  extern_inkomen: `€ ${(external_income || 0).toFixed(2)}`,
                  externe_uren: `${external_hours || 0} uren`,
                  datum: new Date().toLocaleDateString('nl-BE'),
                },
              },
            ],
            webhook_url: webhookUrl,
          }),
        });

        if (submissionResp.ok) {
          const submissionData = await submissionResp.json();
          const submitters = Array.isArray(submissionData) ? submissionData : [submissionData];
          const signingUrl = submitters[0]?.embed_src || (submitters[0]?.slug ? `https://docuseal.com/s/${submitters[0].slug}` : null);
          const submissionId = submitters[0]?.submission_id || submitters[0]?.id || null;

          // Update the declaration with DocuSeal info
          if (submissionId) {
            const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
            const adminClient = createClient(supabaseUrl, serviceRoleKey);
            await adminClient
              .from("compliance_declarations")
              .update({
                docuseal_submission_id: submissionId,
                signature_status: "pending",
              })
              .eq("id", declaration_id);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            signing_url: signingUrl || submitters[0]?.embed_src,
            submission_id: submissionId,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          const errText = await submissionResp.text();
          console.error("DocuSeal submission error:", errText);
          return new Response(JSON.stringify({ 
            success: true, 
            signing_url: null,
            message: "Declaration saved but DocuSeal signing unavailable",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (docuErr) {
        console.error("DocuSeal error:", docuErr);
        return new Response(JSON.stringify({ 
          success: true, 
          signing_url: null,
          message: "Declaration saved but DocuSeal signing unavailable",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST create-season-submission: Create DocuSeal submission for season contract
    if (req.method === "POST" && action === "create-season-submission") {
      const body = await req.json();
      const { template_id, season_id, club_id, volunteer_id, volunteer_email, volunteer_name } = body;

      console.log("create-season-submission:", JSON.stringify({ template_id, season_id, club_id, volunteer_id }));

      if (!template_id || !season_id || !club_id || !volunteer_id) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      // Get volunteer email if not provided
      let email = volunteer_email;
      if (!email) {
        const { data: volProfile } = await adminClient.from("profiles").select("email").eq("id", volunteer_id).maybeSingle();
        email = volProfile?.email;
        if (!email) {
          const { data: authUser } = await adminClient.auth.admin.getUserById(volunteer_id);
          email = authUser?.user?.email;
        }
      }
      if (!email) {
        return new Response(JSON.stringify({ error: "Volunteer email not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get template info
      const { data: tmpl } = await adminClient
        .from("season_contract_templates")
        .select("name, category, docuseal_template_id, template_data")
        .eq("id", template_id)
        .maybeSingle();

      if (!tmpl) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get season + club info for merge fields
      const [seasonRes, clubRes, volRes] = await Promise.all([
        adminClient.from("seasons").select("name, start_date, end_date").eq("id", season_id).maybeSingle(),
        adminClient.from("clubs").select("name, location, sport").eq("id", club_id).maybeSingle(),
        adminClient.from("profiles").select("full_name, email, phone, bank_iban").eq("id", volunteer_id).maybeSingle(),
      ]);

      // Build a simple HTML contract from template content
      const seasonData = seasonRes.data;
      const clubData = clubRes.data;
      const volData = volRes.data;

      const roleName = volunteer_name || volData?.full_name || email;
      const htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;">
          <h1 style="text-align:center;color:#1a1a1a;">Seizoensovereenkomst – ${tmpl.name}</h1>
          <p style="text-align:center;color:#6b7280;font-style:italic;">Conform de Wet van 3 juli 2005 betreffende de rechten van vrijwilligers<br/>Verhoogd plafond sportvrijwilligers: €3.233,91/jaar</p>
          <hr/>
          <h2>1. Partijen</h2>
          <p><strong>Organisatie:</strong> ${clubData?.name || 'Club'} ${clubData?.location ? ` – ${clubData.location}` : ''}</p>
          <p><strong>Vrijwilliger:</strong> ${roleName}</p>
          ${volData?.email ? `<p><strong>E-mail:</strong> ${volData.email}</p>` : ''}
          ${volData?.phone ? `<p><strong>Telefoon:</strong> ${volData.phone}</p>` : ''}
          <hr/>
          <h2>2. Seizoen</h2>
          <p><strong>Seizoen:</strong> ${seasonData?.name || 'Huidig seizoen'}</p>
          <p><strong>Looptijd:</strong> ${seasonData?.start_date ? new Date(seasonData.start_date).toLocaleDateString('nl-BE') : ''} t.e.m. ${seasonData?.end_date ? new Date(seasonData.end_date).toLocaleDateString('nl-BE') : ''}</p>
          <hr/>
          <h2>3. Rol</h2>
          <p><strong>Functie:</strong> ${tmpl.name}</p>
          <p><strong>Categorie:</strong> ${tmpl.category}</p>
          <hr/>
          <h2>4. Proefperiode</h2>
          <p>De eerste 3 aanwezigheden gelden als proefperiode. Vanaf de 4e aanwezigheid treedt het volledige contract in werking en wordt de vrijwilliger als actief (betalend) beschouwd.</p>
          <hr/>
          <h2>5. Kostenvergoeding</h2>
          <p>De vrijwilliger heeft recht op een kostenvergoeding conform het Koninklijk Besluit. Het maximale jaarplafond bedraagt €3.233,91 (sportvrijwilligers).</p>
          <hr/>
          <h2>6. Slotbepalingen</h2>
          <p>Dit contract wordt beheerst door het Belgisch recht. In geval van geschil zijn de rechtbanken van het arrondissement van de zetel van de organisatie bevoegd.</p>
          <br/><br/>
          <p>Opgemaakt op ${new Date().toLocaleDateString('nl-BE')}</p>
          <br/><br/>
          <p><strong>Handtekening vrijwilliger:</strong></p>
        </div>
      `;

      // Create DocuSeal HTML template
      const createTemplateResp = await fetch(`${DOCUSEAL_API_URL}/templates/html`, {
        method: "POST",
        headers: { "X-Auth-Token": DOCUSEAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlContent, name: `Seizoen ${tmpl.name} - ${roleName}` }),
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

      // Create submission
      const webhookUrl = `${supabaseUrl}/functions/v1/docuseal?action=webhook`;
      const submissionResp = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
        method: "POST",
        headers: { "X-Auth-Token": DOCUSEAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: docusealTemplateId,
          send_email: true,
          submitters: [{ email, name: roleName, role: docuTemplate.submitters?.[0]?.name || "First Party" }],
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

      // Save to season_contracts
      const { error: dbError } = await adminClient.from("season_contracts").insert({
        club_id,
        season_id,
        template_id,
        volunteer_id,
        status: "sent",
        docuseal_submission_id: submissionId,
        signing_url: signingUrl,
      });

      if (dbError) {
        console.error("DB insert error:", dbError);
      }

      // Notify volunteer (in-app)
      await adminClient.from("notifications").insert({
        user_id: volunteer_id,
        title: "Nieuw seizoenscontract",
        message: `Je hebt een nieuw seizoenscontract (${tmpl.name}) ontvangen om te ondertekenen.`,
        type: "contract_sent",
      });

      // Push notification to volunteer
      try {
        const pushUrl = `${supabaseUrl}/functions/v1/send-native-push`;
        await fetch(pushUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ user_id: volunteer_id, title: '📝 Nieuw contract!', message: `Er staat een nieuw seizoenscontract (${tmpl.name}) klaar om te ondertekenen.`, url: '/dashboard', type: 'contract_sent' }),
        });
      } catch (e) { console.warn('Push for contract_sent failed:', e); }

      console.log("Season contract created:", submissionId, "signing_url:", signingUrl);

      return new Response(JSON.stringify({ success: true, submission_id: submissionId, signing_url: signingUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("DocuSeal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
