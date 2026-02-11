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
              name: volunteer_name || undefined,
              role: "Volunteer",
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
      const signingUrl = submission.embed_src || submission.slug
        ? `https://docuseal.com/s/${submission.slug}`
        : null;

      // Look up volunteer by email to get their user id
      const { data: volunteerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", volunteer_email)
        .maybeSingle();

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
