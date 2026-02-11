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

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
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

    // POST webhook: DocuSeal calls this when a form is completed
    if (req.method === "POST" && action === "webhook") {
      const body = await req.json();
      console.log("DocuSeal webhook received:", JSON.stringify(body));

      const { event_type, data: webhookData } = body;

      if (event_type === "form.completed" && webhookData) {
        const submissionId = webhookData.submission_id || webhookData.id;
        const documents = webhookData.documents || [];
        const documentUrl = documents.length > 0 ? documents[0].url : null;

        if (submissionId) {
          // Use service role to bypass RLS
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (serviceRoleKey) {
            const adminClient = createClient(supabaseUrl, serviceRoleKey);
            
            // Find signature request by docuseal_submission_id
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

              // Notify the club owner
              await adminClient.from("notifications").insert({
                user_id: sigReq.club_owner_id,
                title: "Contract ondertekend",
                message: "Een vrijwilliger heeft het contract ondertekend.",
                type: "contract_signed",
                metadata: { task_id: sigReq.task_id, signature_request_id: sigReq.id },
              });

              console.log("Webhook: Updated signature request", sigReq.id, "to completed");
            } else {
              console.log("Webhook: No matching signature request for submission", submissionId);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST send-personalized-contract: Create DocuSeal template from personalized PDF + submission
    if (req.method === "POST" && action === "send-personalized-contract") {
      const body = await req.json();
      const { pdf_url, task_id, volunteer_id, volunteer_email, volunteer_name } = body;

      console.log("send-personalized-contract:", JSON.stringify({ task_id, volunteer_id, volunteer_email }));

      if (!pdf_url || !task_id || !volunteer_email) {
        return new Response(JSON.stringify({ error: "Missing required fields: pdf_url, task_id, volunteer_email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use POST /submissions/pdf to create a one-off submission directly from the PDF
      // This combines template creation + submission in one step and properly supports fields
      const submissionResp = await fetch(`${DOCUSEAL_API_URL}/submissions/pdf`, {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Contract ${volunteer_name || volunteer_email} - ${new Date().toISOString().slice(0, 10)}`,
          documents: [{ name: "contract.pdf", file: pdf_url }],
          send_email: true,
          fields: [
            { name: "Handtekening", type: "signature", role: "First Party" },
          ],
          submitters: [{
            email: volunteer_email,
            name: volunteer_name || undefined,
            role: "First Party",
          }],
        }),
      });

      const submissionData = await submissionResp.json();
      console.log("submissions/pdf response status:", submissionResp.status, "data:", JSON.stringify(submissionData).slice(0, 500));

      if (!submissionResp.ok) {
        throw new Error(`DocuSeal API error [${submissionResp.status}]: ${JSON.stringify(submissionData)}`);
      }

      // submissions/pdf returns { id, submitters: [{ slug, ... }] } - not an array
      const submissionId = submissionData.id;
      const firstSubmitter = submissionData.submitters?.[0];
      const signingUrl = firstSubmitter?.embed_src
        || (firstSubmitter?.slug ? `https://docuseal.com/s/${firstSubmitter.slug}` : null);

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

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("DocuSeal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
