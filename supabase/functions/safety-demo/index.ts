import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { club_id } = await req.json();
    if (!club_id) throw new Error("club_id required");

    // Step 1: Create demo event (is_live = false, pre-event mode)
    const { data: event, error: evErr } = await supabase
      .from("events")
      .insert({
        club_id,
        title: "Demo Veiligheidsdag 2026",
        description: "Automatisch gegenereerd demo-scenario voor Safety & Security",
        event_date: new Date().toISOString(),
        location: "Demo Stadion",
        status: "open",
        event_type: "event",
        is_live: false,
      })
      .select("id")
      .single();
    if (evErr) throw evErr;
    const eventId = event.id;

    // Step 2: Create 6 zones
    const zoneNames = [
      { name: "Hoofdtribune", color: "#22c55e" },
      { name: "Bezoekerstribune", color: "#3b82f6" },
      { name: "Parking", color: "#f59e0b" },
      { name: "VIP-lounge", color: "#8b5cf6" },
      { name: "Speelveldomgeving", color: "#06b6d4" },
      { name: "Ingang & Fouillering", color: "#ec4899" },
    ];
    const { data: zones } = await supabase
      .from("safety_zones")
      .insert(zoneNames.map((z, i) => ({ event_id: eventId, club_id, name: z.name, color: z.color, sort_order: i, status: "normal" })))
      .select("id, name");

    const zoneMap: Record<string, string> = {};
    zones?.forEach((z: any) => { zoneMap[z.name] = z.id; });

    // Step 3: Create 6 incident types (idempotent)
    const typesDef = [
      { label: "Medisch", icon: "Heart", color: "#ef4444", default_priority: "medium" },
      { label: "Brand", icon: "Flame", color: "#f97316", default_priority: "high" },
      { label: "Agressie", icon: "ShieldAlert", color: "#dc2626", default_priority: "high" },
      { label: "Diefstal", icon: "Lock", color: "#6366f1", default_priority: "low" },
      { label: "Evacuatie", icon: "LogOut", color: "#eab308", default_priority: "high" },
      { label: "Verdacht pakket", icon: "Package", color: "#7c3aed", default_priority: "high" },
    ];

    const { data: existingTypes } = await supabase
      .from("safety_incident_types")
      .select("label")
      .eq("club_id", club_id);
    const existingLabels = new Set((existingTypes || []).map((t: any) => t.label));
    const newTypes = typesDef.filter(t => !existingLabels.has(t.label));

    if (newTypes.length > 0) {
      await supabase
        .from("safety_incident_types")
        .insert(newTypes.map((t, i) => ({ club_id, ...t, sort_order: (existingTypes?.length || 0) + i })));
    }

    const { data: finalTypes } = await supabase
      .from("safety_incident_types")
      .select("id, label")
      .eq("club_id", club_id);
    const typeMap: Record<string, string> = {};
    finalTypes?.forEach((t: any) => { typeMap[t.label] = t.id; });

    // Step 4: Create checklist items PER ZONE (2-3 per zone)
    const checklistPerZone: Record<string, string[]> = {
      "Hoofdtribune": ["Zitjes gecontroleerd op schade", "Nooduitgangen vrij en gemarkeerd", "Camerasysteem operationeel"],
      "Bezoekerstribune": ["Hekwerk geïnspecteerd", "Nooduitgangen vrij", "Stewards op positie"],
      "Parking": ["Verkeersroutes gemarkeerd", "Brandblussers geïnspecteerd", "Parkeerplaatsen aangeduid"],
      "VIP-lounge": ["AED-locatie gemarkeerd", "Bar & catering klaar", "Beveiligingspersoneel gebrieft"],
      "Speelveldomgeving": ["Veld gecontroleerd op obstakels", "Eerste hulppost bemand"],
      "Ingang & Fouillering": ["Fouilleerteam gebrieft", "Detectiepoorten getest", "Wachtlijnen opgesteld"],
    };

    const checklistInserts: any[] = [];
    let sortIdx = 0;
    for (const [zoneName, items] of Object.entries(checklistPerZone)) {
      const zoneId = zoneMap[zoneName];
      if (!zoneId) continue;
      for (const desc of items) {
        checklistInserts.push({ event_id: eventId, club_id, description: desc, zone_id: zoneId, sort_order: sortIdx++ });
      }
    }
    const { data: insertedChecklist } = await supabase
      .from("safety_checklist_items")
      .insert(checklistInserts)
      .select("id, zone_id");

    // Return event_id immediately — background simulation starts
    const response = new Response(
      JSON.stringify({ event_id: eventId, message: "Demo gestart! Checklist voortgang verschijnt de komende 2 minuten." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // Step 5: Background simulation
    // Phase 1 (~2 min): Progressively complete checklist items
    // Phase 2: User clicks GO LIVE manually
    // Phase 3 (~3 min after GO LIVE): Incidents come in
    (async () => {
      const allChecklistIds = (insertedChecklist || []).map((ci: any) => ci.id);
      const totalItems = allChecklistIds.length;

      // Phase 1: Complete checklist items one by one over ~2 minutes
      if (totalItems > 0) {
        const delayPerItem = Math.floor(120 / totalItems); // ~120 seconds / items
        for (let i = 0; i < totalItems; i++) {
          await new Promise(r => setTimeout(r, delayPerItem * 1000));
          try {
            await supabase.from("safety_checklist_progress").insert({
              checklist_item_id: allChecklistIds[i],
              volunteer_id: user.id,
              is_completed: true,
              completed_at: new Date().toISOString(),
            });
          } catch (e) {
            console.error("Failed to insert checklist progress:", e);
          }
        }
      }

      // Phase 2: Wait for GO LIVE — poll every 5 seconds for up to 5 minutes
      let liveDetected = false;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: ev } = await supabase.from("events").select("is_live").eq("id", eventId).single();
        if (ev?.is_live) {
          liveDetected = true;
          break;
        }
      }

      if (!liveDetected) {
        console.log("GO LIVE not detected within 5 minutes, skipping incident simulation.");
        return;
      }

      // Phase 3: Simulate incidents over ~3 minutes
      const incidents = [
        { delay: 10, type: "Medisch", zone: "Hoofdtribune", priority: "medium", desc: "Bezoeker flauwgevallen bij rij 12" },
        { delay: 25, type: "Diefstal", zone: "Parking", priority: "low", desc: "Gestolen rugzak gemeld bij parking P2" },
        { delay: 40, type: "Agressie", zone: "Ingang & Fouillering", priority: "high", desc: "Vechtpartij bij ingang Noord" },
        { delay: 55, type: "Medisch", zone: "Speelveldomgeving", priority: "medium", desc: "Snijwond bij steward tijdens opbouw" },
        { delay: 70, type: "Verdacht pakket", zone: "VIP-lounge", priority: "high", desc: "Onbeheerde tas naast bar VIP" },
        { delay: 90, type: "Brand", zone: "Parking", priority: "high", desc: "Rookontwikkeling bij foodtruck zone C" },
        { delay: 110, type: "Agressie", zone: "Bezoekerstribune", priority: "medium", desc: "Verbale escalatie tussen supporters" },
        { delay: 130, type: "Medisch", zone: "VIP-lounge", priority: "high", desc: "Allergische reactie - epinefrine nodig" },
        { delay: 150, type: "Evacuatie", zone: "Bezoekerstribune", priority: "high", desc: "Gedeeltelijke evacuatie zone B vereist" },
        { delay: 170, type: "Diefstal", zone: "Hoofdtribune", priority: "low", desc: "Poging tot zakkenrollerij gemeld" },
      ];

      for (const inc of incidents) {
        await new Promise(r => setTimeout(r, inc.delay * 1000));
        try {
          await supabase.from("safety_incidents").insert({
            event_id: eventId,
            club_id,
            incident_type_id: typeMap[inc.type] || null,
            zone_id: zoneMap[inc.zone] || null,
            reporter_id: user.id,
            description: inc.desc,
            priority: inc.priority,
            status: "nieuw",
          });
        } catch (e) {
          console.error("Failed to insert incident:", e);
        }
      }
    })();

    return response;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
