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
      const { template_id, task_id, volunteer_email, volunteer_name } = body;

      if (!template_id || !task_id || !volunteer_email) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
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

      // Only include prefilled fields that match template fields
      const fields = Object.entries(prefilledFields)
        .filter(([name]) => templateFieldNames.has(name))
        .map(([name, default_value]) => ({
          name,
          default_value,
          readonly: false,
        }));

      console.log("Template fields:", [...templateFieldNames]);
      console.log("Sending fields:", fields.map(f => f.name));

      // Determine the submitter role from the template
      const submitterRole = templateData.submitters?.[0]?.name || "First Party";

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
          submitters: [
            {
              email: volunteer_email,
              name: volunteer_name || volunteerProfile?.full_name || undefined,
              role: submitterRole,
              fields,
            },
          ],
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
      const standardFields = [
        { name: "Naam", type: "text", role: "Volunteer" },
        { name: "E-mail", type: "text", role: "Volunteer" },
        { name: "Telefoon", type: "text", role: "Volunteer" },
        { name: "IBAN", type: "text", role: "Volunteer" },
        { name: "Rekeninghouder", type: "text", role: "Volunteer" },
        { name: "Clubnaam", type: "text", role: "Volunteer" },
        { name: "Taak", type: "text", role: "Volunteer" },
        { name: "Beschrijving", type: "text", role: "Volunteer" },
        { name: "Datum", type: "text", role: "Volunteer" },
        { name: "Starttijd", type: "text", role: "Volunteer" },
        { name: "Eindtijd", type: "text", role: "Volunteer" },
        { name: "Uren", type: "text", role: "Volunteer" },
        { name: "Locatie", type: "text", role: "Volunteer" },
        { name: "Briefing tijd", type: "text", role: "Volunteer" },
        { name: "Verzamelplaats", type: "text", role: "Volunteer" },
        { name: "Onkostenvergoeding", type: "text", role: "Volunteer" },
        { name: "Handtekening", type: "signature", role: "Volunteer" },
      ];

      // Send the URL directly to DocuSeal instead of downloading + base64 encoding
      // This avoids memory limit issues in the edge function
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
          fields: standardFields,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DocuSeal API error [${resp.status}]: ${JSON.stringify(data)}`);
      }

      const docusealTemplateId = data.id;

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
