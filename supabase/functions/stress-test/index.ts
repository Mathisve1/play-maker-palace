import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Stress-test: simulates 450 volunteers performing concurrent operations
 * - Phase 1: 450 checklist completions (batched, rapid-fire)
 * - Phase 2: 450 realtime broadcasts (channel messages)
 * - Phase 3: 100 incident reports (concurrent inserts)
 * - Phase 4: 200 status updates (concurrent updates)
 * 
 * Returns timing metrics for each phase.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { club_id, event_id, action } = await req.json();

    if (!club_id) throw new Error("club_id required");

    // ═══════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════
    if (action === "cleanup") {
      await supabase.from("safety_incidents").delete().eq("club_id", club_id).like("description", "STRESS-TEST%");
      
      const { data: stressItems } = await supabase
        .from("safety_checklist_items")
        .select("id")
        .eq("club_id", club_id)
        .like("description", "STRESS-TEST%");
      
      if (stressItems?.length) {
        const ids = stressItems.map((i: any) => i.id);
        await supabase.from("safety_checklist_progress").delete().in("checklist_item_id", ids);
        await supabase.from("safety_checklist_items").delete().in("id", ids);
      }

      return new Response(JSON.stringify({ message: "Stress-test data opgeruimd" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // RUN STRESS TEST
    // ═══════════════════════════════════════════
    if (!event_id) throw new Error("event_id required");

    const VOLUNTEER_COUNT = 450;
    const results: any = { volunteer_count: VOLUNTEER_COUNT, phases: {} };

    // Get incident types
    const { data: incTypes } = await supabase
      .from("safety_incident_types")
      .select("id, default_priority")
      .eq("club_id", club_id)
      .limit(6);

    // Get zones
    const { data: zones } = await supabase
      .from("safety_zones")
      .select("id")
      .eq("event_id", event_id);

    const zoneIds = (zones || []).map((z: any) => z.id);
    const typeIds = (incTypes || []).map((t: any) => t.id);

    // ── Phase 1: Create 450 checklist items + complete them concurrently ──
    console.log("Phase 1: Creating 450 checklist items...");
    let t0 = Date.now();

    // Batch insert 450 items in chunks of 50
    const CHUNK = 50;
    const allItemIds: string[] = [];
    
    for (let batch = 0; batch < Math.ceil(VOLUNTEER_COUNT / CHUNK); batch++) {
      const items = [];
      for (let i = 0; i < CHUNK && (batch * CHUNK + i) < VOLUNTEER_COUNT; i++) {
        const idx = batch * CHUNK + i;
        items.push({
          event_id,
          club_id,
          description: `STRESS-TEST item ${idx + 1}`,
          zone_id: zoneIds[idx % zoneIds.length] || null,
          sort_order: 1000 + idx,
        });
      }
      const { data: inserted } = await supabase
        .from("safety_checklist_items")
        .insert(items)
        .select("id");
      if (inserted) allItemIds.push(...inserted.map((r: any) => r.id));
    }

    const createTime = Date.now() - t0;
    console.log(`Created ${allItemIds.length} items in ${createTime}ms`);

    // Now complete all 450 concurrently (simulating 450 volunteers ticking at once)
    t0 = Date.now();
    const completionPromises = allItemIds.map((itemId, idx) =>
      supabase.from("safety_checklist_progress").insert({
        checklist_item_id: itemId,
        volunteer_id: user.id, // We use the same user for simplicity - the load matters, not unique users
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
    );

    // Fire all 450 at once in batches of 50 to avoid connection limits
    const completionResults = [];
    for (let i = 0; i < completionPromises.length; i += CHUNK) {
      const batch = completionPromises.slice(i, i + CHUNK);
      const batchResults = await Promise.allSettled(batch);
      completionResults.push(...batchResults);
    }

    const completionTime = Date.now() - t0;
    const completionSuccesses = completionResults.filter(r => r.status === "fulfilled").length;
    const completionFailures = completionResults.filter(r => r.status === "rejected").length;

    results.phases.checklist_completions = {
      total: VOLUNTEER_COUNT,
      succeeded: completionSuccesses,
      failed: completionFailures,
      duration_ms: completionTime,
      ops_per_second: Math.round((completionSuccesses / completionTime) * 1000),
    };
    console.log(`Phase 1 done: ${completionSuccesses}/${VOLUNTEER_COUNT} in ${completionTime}ms`);

    // ── Phase 2: 450 realtime channel broadcasts ──
    console.log("Phase 2: Broadcasting 450 realtime messages...");
    t0 = Date.now();

    const broadcastPromises = Array.from({ length: VOLUNTEER_COUNT }, (_, idx) =>
      supabase.channel(`stress-test-${event_id}`).send({
        type: "broadcast",
        event: "volunteer-ping",
        payload: {
          volunteer_index: idx,
          timestamp: Date.now(),
          zone_id: zoneIds[idx % zoneIds.length],
        },
      })
    );

    const broadcastResults = [];
    for (let i = 0; i < broadcastPromises.length; i += CHUNK) {
      const batch = broadcastPromises.slice(i, i + CHUNK);
      const batchResults = await Promise.allSettled(batch);
      broadcastResults.push(...batchResults);
    }

    const broadcastTime = Date.now() - t0;
    const broadcastSuccesses = broadcastResults.filter(r => r.status === "fulfilled").length;

    results.phases.realtime_broadcasts = {
      total: VOLUNTEER_COUNT,
      succeeded: broadcastSuccesses,
      failed: broadcastResults.filter(r => r.status === "rejected").length,
      duration_ms: broadcastTime,
      ops_per_second: Math.round((broadcastSuccesses / broadcastTime) * 1000),
    };
    console.log(`Phase 2 done: ${broadcastSuccesses}/${VOLUNTEER_COUNT} in ${broadcastTime}ms`);

    // ── Phase 3: 100 concurrent incident reports ──
    const INCIDENT_COUNT = 100;
    console.log(`Phase 3: Inserting ${INCIDENT_COUNT} incidents concurrently...`);
    t0 = Date.now();

    const incidentPromises = Array.from({ length: INCIDENT_COUNT }, (_, idx) =>
      supabase.from("safety_incidents").insert({
        event_id,
        club_id,
        incident_type_id: typeIds[idx % typeIds.length] || null,
        zone_id: zoneIds[idx % zoneIds.length] || null,
        reporter_id: user.id,
        description: `STRESS-TEST incident #${idx + 1}`,
        priority: ["low", "medium", "high"][idx % 3],
        status: "nieuw",
        lat: 50.855 + (Math.random() - 0.5) * 0.01,
        lng: 3.307 + (Math.random() - 0.5) * 0.01,
      })
    );

    const incidentResults = [];
    for (let i = 0; i < incidentPromises.length; i += CHUNK) {
      const batch = incidentPromises.slice(i, i + CHUNK);
      const batchResults = await Promise.allSettled(batch);
      incidentResults.push(...batchResults);
    }

    const incidentTime = Date.now() - t0;
    const incidentSuccesses = incidentResults.filter(r => r.status === "fulfilled").length;

    results.phases.incident_reports = {
      total: INCIDENT_COUNT,
      succeeded: incidentSuccesses,
      failed: incidentResults.filter(r => r.status === "rejected").length,
      duration_ms: incidentTime,
      ops_per_second: Math.round((incidentSuccesses / incidentTime) * 1000),
    };
    console.log(`Phase 3 done: ${incidentSuccesses}/${INCIDENT_COUNT} in ${incidentTime}ms`);

    // ── Phase 4: 200 concurrent status updates ──
    const UPDATE_COUNT = Math.min(200, allItemIds.length);
    console.log(`Phase 4: ${UPDATE_COUNT} concurrent status updates...`);
    t0 = Date.now();

    const updatePromises = allItemIds.slice(0, UPDATE_COUNT).map((itemId) =>
      supabase.from("safety_checklist_progress")
        .update({ is_completed: false })
        .eq("checklist_item_id", itemId)
    );

    const updateResults = [];
    for (let i = 0; i < updatePromises.length; i += CHUNK) {
      const batch = updatePromises.slice(i, i + CHUNK);
      const batchResults = await Promise.allSettled(batch);
      updateResults.push(...batchResults);
    }

    const updateTime = Date.now() - t0;
    const updateSuccesses = updateResults.filter(r => r.status === "fulfilled").length;

    results.phases.status_updates = {
      total: UPDATE_COUNT,
      succeeded: updateSuccesses,
      failed: updateResults.filter(r => r.status === "rejected").length,
      duration_ms: updateTime,
      ops_per_second: Math.round((updateSuccesses / updateTime) * 1000),
    };
    console.log(`Phase 4 done: ${updateSuccesses}/${UPDATE_COUNT} in ${updateTime}ms`);

    // ── Summary ──
    const totalOps = VOLUNTEER_COUNT + VOLUNTEER_COUNT + INCIDENT_COUNT + UPDATE_COUNT;
    const totalTime = createTime + completionTime + broadcastTime + incidentTime + updateTime;
    results.summary = {
      total_operations: totalOps,
      total_duration_ms: totalTime,
      overall_ops_per_second: Math.round((totalOps / totalTime) * 1000),
      verdict: totalTime < 30000 ? "✅ PASSED — systeem kan 450 vrijwilligers aan" 
             : totalTime < 60000 ? "⚠️ MARGINAL — werkt maar grensgevallen mogelijk"
             : "❌ FAILED — optimalisatie nodig",
    };

    console.log("Stress test complete:", JSON.stringify(results.summary));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Stress test error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
