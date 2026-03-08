import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function csvResp(rows: Record<string, unknown>[]) {
  if (!rows.length) return new Response("", { headers: { ...corsHeaders, "Content-Type": "text/csv" } });
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")];
  for (const r of rows) {
    lines.push(keys.map((k) => {
      const v = r[k];
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }
  return new Response(lines.join("\n"), {
    headers: { ...corsHeaders, "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=export.csv" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();

  try {
    // Accept API key via x-api-key header or Authorization: Bearer <key>
    const xApiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("Authorization");
    let apiKey = "";
    if (xApiKey) {
      apiKey = xApiKey.trim();
    } else if (authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.replace("Bearer ", "").trim();
    }
    if (!apiKey) {
      return jsonResp({ error: "Missing API key. Use Authorization: Bearer <key> or x-api-key header." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lookup key
    const { data: keyRow, error: keyErr } = await supabase
      .from("club_api_keys")
      .select("id, club_id, is_active, calls_this_hour, hour_window_start")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .maybeSingle();

    if (keyErr || !keyRow) return jsonResp({ error: "Invalid or inactive API key" }, 401);

    // Rate limiting — 100 calls/hour
    const now = new Date();
    const windowStart = keyRow.hour_window_start ? new Date(keyRow.hour_window_start) : null;
    const sameWindow = windowStart && (now.getTime() - windowStart.getTime()) < 3600_000;

    if (sameWindow && keyRow.calls_this_hour >= 100) {
      // Log rate-limited call
      await supabase.from("api_usage_logs").insert({
        club_id: keyRow.club_id,
        api_key_id: keyRow.id,
        resource: "rate_limited",
        format: "json",
        status_code: 429,
        response_rows: 0,
        duration_ms: Date.now() - startTime,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      });
      return jsonResp({ error: "Rate limit exceeded. Max 100 calls per hour." }, 429);
    }

    // Update usage counters
    await supabase
      .from("club_api_keys")
      .update({
        last_used_at: now.toISOString(),
        calls_this_hour: sameWindow ? keyRow.calls_this_hour + 1 : 1,
        hour_window_start: sameWindow ? keyRow.hour_window_start : now.toISOString(),
      })
      .eq("id", keyRow.id);

    const clubId = keyRow.club_id;
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource");
    const format = url.searchParams.get("format") || "json";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000"), 1000);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!resource) {
      await logUsage(supabase, keyRow, "discovery", format, 200, 0, startTime, req);
      return jsonResp({
        available_resources: [
          "volunteers", "tasks", "events", "signups", "payments",
          "sepa_batches", "compliance", "contracts", "tickets", "partners",
        ],
        parameters: { resource: "required", format: "json|csv", from: "ISO date", to: "ISO date", limit: "max 1000", offset: "number" },
      });
    }

    let rows: Record<string, unknown>[] = [];

    switch (resource) {
      case "tasks": {
        let q = supabase.from("tasks").select("*").eq("club_id", clubId).range(offset, offset + limit - 1);
        if (from) q = q.gte("date", from);
        if (to) q = q.lte("date", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "events": {
        let q = supabase.from("events").select("*").eq("club_id", clubId).range(offset, offset + limit - 1);
        if (from) q = q.gte("event_date", from);
        if (to) q = q.lte("event_date", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "volunteers": {
        const { data: taskData } = await supabase.from("tasks").select("id").eq("club_id", clubId);
        const taskIds = (taskData || []).map((t: any) => t.id);
        if (taskIds.length === 0) break;
        const { data: signupData } = await supabase
          .from("task_signups")
          .select("volunteer_id")
          .in("task_id", taskIds);
        const volIds = [...new Set((signupData || []).map((s: any) => s.volunteer_id))];
        if (volIds.length === 0) break;
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url, created_at")
          .in("id", volIds.slice(offset, offset + limit));
        rows = profileData || [];
        break;
      }
      case "signups": {
        const { data: taskData } = await supabase.from("tasks").select("id").eq("club_id", clubId);
        const taskIds = (taskData || []).map((t: any) => t.id);
        if (taskIds.length === 0) break;
        let q = supabase.from("task_signups").select("*").in("task_id", taskIds).range(offset, offset + limit - 1);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "payments": {
        let q = supabase.from("volunteer_payments").select("*").eq("club_id", clubId).range(offset, offset + limit - 1);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "sepa_batches": {
        const { data } = await supabase.from("sepa_batches").select("*, sepa_batch_items(*)").eq("club_id", clubId).range(offset, offset + limit - 1);
        rows = data || [];
        break;
      }
      case "compliance": {
        const { data: taskData } = await supabase.from("tasks").select("id").eq("club_id", clubId);
        const taskIds = (taskData || []).map((t: any) => t.id);
        if (taskIds.length === 0) break;
        const { data: signupData } = await supabase.from("task_signups").select("volunteer_id").in("task_id", taskIds);
        const volIds = [...new Set((signupData || []).map((s: any) => s.volunteer_id))];
        if (volIds.length === 0) break;
        let q = supabase.from("compliance_declarations").select("*").in("volunteer_id", volIds).range(offset, offset + limit - 1);
        if (from) q = q.gte("declared_at", from);
        if (to) q = q.lte("declared_at", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "contracts": {
        let q = supabase.from("season_contracts").select("*").eq("club_id", clubId).range(offset, offset + limit - 1);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "tickets": {
        let q = supabase.from("volunteer_tickets").select("*").eq("club_id", clubId).range(offset, offset + limit - 1);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        const { data } = await q;
        rows = data || [];
        break;
      }
      case "partners": {
        const { data } = await supabase.from("external_partners").select("*").eq("club_id", clubId).range(offset, offset + limit - 1);
        rows = data || [];
        break;
      }
      default:
        await logUsage(supabase, keyRow, resource, format, 400, 0, startTime, req);
        return jsonResp({ error: `Unknown resource: ${resource}. Use ?resource without value to see available resources.` }, 400);
    }

    // Log successful call
    await logUsage(supabase, keyRow, resource, format, 200, rows.length, startTime, req);

    return format === "csv" ? csvResp(rows) : jsonResp({ data: rows, count: rows.length, resource, offset, limit });
  } catch (err) {
    return jsonResp({ error: "Internal server error", details: String(err) }, 500);
  }
});

async function logUsage(
  supabase: any,
  keyRow: { id: string; club_id: string },
  resource: string,
  format: string,
  statusCode: number,
  responseRows: number,
  startTime: number,
  req: Request,
) {
  try {
    await supabase.from("api_usage_logs").insert({
      club_id: keyRow.club_id,
      api_key_id: keyRow.id,
      resource,
      format,
      status_code: statusCode,
      response_rows: responseRows,
      duration_ms: Date.now() - startTime,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
    });
  } catch (_) {
    // Don't fail the request if logging fails
  }
}
