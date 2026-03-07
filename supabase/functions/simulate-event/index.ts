import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_EVENT_TITLE = "SIMULATIE: FC Harelbeke vs KV Kortrijk";
const VOLUNTEER_TEST_EMAIL = "vaneeckhoutmathis4@gmail.com";

// 35 dummy volunteer names
const DUMMY_NAMES = [
  "Jan Peeters", "Marie Janssens", "Pieter De Smet", "An Willems",
  "Tom Claes", "Eva Martens", "Koen Jacobs", "Lisa Vermeersch",
  "Bart Wouters", "Sara Maes", "Nico Van Damme", "Julie Hermans",
  "Kevin Mertens", "Sofie De Wolf", "Jens Vandenberghe", "Laura Peeters",
  "Wout Stevens", "Eline Bogaert", "Robbe Lenaerts", "Charlotte Devos",
  "Stijn De Cock", "Nathalie Claeys", "Dieter Verhoeven", "Elien Baert",
  "Simon Vanhove", "Anja Michiels", "Thomas Desmedt", "Griet Vandewalle",
  "Bram Goossens", "Lies Declerck", "Joris Van Hoeck", "Kim Segers",
  "Yannick Coppens", "Hanne Buysse", "Thibault Lemaire",
];

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
    const { club_id, action } = await req.json();
    if (!club_id) throw new Error("club_id required");

    // ═══════════════════════════════════════════
    // DELETE MODE — clean up all demo data
    // ═══════════════════════════════════════════
    if (action === "delete") {
      const { data: demoEvents } = await supabase
        .from("events")
        .select("id")
        .eq("club_id", club_id)
        .eq("title", DEMO_EVENT_TITLE);

      if (!demoEvents?.length) {
        return new Response(JSON.stringify({ message: "Geen simulatie data gevonden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const ev of demoEvents) {
        const eventId = ev.id;

        // Safety data
        const { data: checklistItems } = await supabase.from("safety_checklist_items").select("id").eq("event_id", eventId);
        const checklistIds = (checklistItems || []).map((c: any) => c.id);
        if (checklistIds.length) {
          await supabase.from("safety_checklist_progress").delete().in("checklist_item_id", checklistIds);
        }
        await supabase.from("safety_checklist_items").delete().eq("event_id", eventId);
        await supabase.from("safety_incidents").delete().eq("event_id", eventId);
        await supabase.from("safety_zones").delete().eq("event_id", eventId);

        // Closing tasks
        await supabase.from("closing_tasks").delete().eq("event_id", eventId);

        // Task data
        const { data: eventTasks } = await supabase.from("tasks").select("id").eq("event_id", eventId);
        const taskIds = (eventTasks || []).map((t: any) => t.id);
        if (taskIds.length) {
          const { data: zones } = await supabase.from("task_zones").select("id").in("task_id", taskIds);
          const zoneIds = (zones || []).map((z: any) => z.id);
          if (zoneIds.length) await supabase.from("task_zone_assignments").delete().in("zone_id", zoneIds);
          await supabase.from("task_zones").delete().in("task_id", taskIds);
          await supabase.from("task_signups").delete().in("task_id", taskIds);
          await supabase.from("hour_confirmations").delete().in("task_id", taskIds);

          // Volunteer safety roles
          await supabase.from("volunteer_safety_roles").delete().eq("event_id", eventId);

          await supabase.from("tasks").delete().in("id", taskIds);
        }

        await supabase.from("event_groups").delete().eq("event_id", eventId);
        await supabase.from("events").delete().eq("id", eventId);
      }

      return new Response(JSON.stringify({ message: "Simulatie data verwijderd! Je kan opnieuw starten." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // CREATE MODE — build full simulation
    // ═══════════════════════════════════════════

    // First check if a simulation already exists
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("club_id", club_id)
      .eq("title", DEMO_EVENT_TITLE)
      .limit(1);

    if (existing?.length) {
      return new Response(JSON.stringify({ error: "Er loopt al een simulatie. Verwijder eerst de vorige via 'delete' actie." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Find the volunteer test account ──
    const { data: testProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", VOLUNTEER_TEST_EMAIL)
      .maybeSingle();
    const testVolunteerId = testProfile?.id || null;

    // ── Gather dummy volunteer IDs ──
    const dummyIds: string[] = [];
    const seenIds = new Set<string>();
    seenIds.add(user.id);
    if (testVolunteerId) seenIds.add(testVolunteerId);

    // Get profiles that match demo names
    const { data: demoProfiles } = await supabase
      .from("profiles")
      .select("id")
      .in("full_name", DUMMY_NAMES);

    for (const p of demoProfiles || []) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        dummyIds.push(p.id);
      }
    }

    // Also check existing club members / previous signups
    const { data: prevSignups } = await supabase
      .from("task_signups")
      .select("volunteer_id, tasks!inner(club_id)")
      .eq("tasks.club_id", club_id)
      .limit(100);

    for (const s of prevSignups || []) {
      if (!seenIds.has(s.volunteer_id)) {
        seenIds.add(s.volunteer_id);
        dummyIds.push(s.volunteer_id);
      }
    }

    // ── Create event ──
    const { data: event, error: evErr } = await supabase
      .from("events")
      .insert({
        club_id,
        title: DEMO_EVENT_TITLE,
        description: "Automatisch gegenereerd simulatie-scenario met 35 vrijwilligers (30 ingeschreven). Duurt max 5 minuten.",
        event_date: new Date().toISOString(),
        location: "Stadion De Mol, Harelbekestraat 30, 8530 Harelbeke",
        status: "open",
        event_type: "event",
        is_live: false,
      })
      .select("id")
      .single();
    if (evErr) throw evErr;
    const eventId = event.id;

    // ── Create groups ──
    const groupDefs = [
      { name: "Stewards Tribune", color: "#3b82f6", wristband_color: "Blauw", wristband_label: "STEWARD", materials_note: "Fluohesje, oortje, walkietalkie" },
      { name: "Parking", color: "#f59e0b", wristband_color: "Geel", wristband_label: "PARKING", materials_note: "Fluohesje, zaklamp" },
      { name: "Catering", color: "#10b981", wristband_color: "Groen", wristband_label: "CATERING", materials_note: "Schort, handschoenen" },
      { name: "EHBO", color: "#ef4444", wristband_color: "Rood", wristband_label: "EHBO", materials_note: "EHBO-kit, AED" },
      { name: "Security", color: "#8b5cf6", wristband_color: "Paars", wristband_label: "SECURITY", materials_note: "Detectiepoort, fouilleerhandschoenen" },
      { name: "VIP & Ontvangst", color: "#ec4899", wristband_color: "Roze", wristband_label: "VIP", materials_note: "Naamkaartje, walkietalkie" },
    ];

    const { data: groups } = await supabase
      .from("event_groups")
      .insert(groupDefs.map((g, i) => ({
        event_id: eventId, name: g.name, color: g.color, sort_order: i,
        wristband_color: g.wristband_color, wristband_label: g.wristband_label, materials_note: g.materials_note,
      })))
      .select("id, name");

    const groupMap: Record<string, string> = {};
    groups?.forEach((g: any) => { groupMap[g.name] = g.id; });

    // ── Create tasks (total spots = 35, 30 will be filled) ──
    const now = new Date();
    const taskDefs = [
      // Stewards Tribune — 12 spots across 3 tasks
      { group: "Stewards Tribune", title: "Noord tribune bewaking", location: "Noord tribune", spots: 4, startH: 0, endH: 3 },
      { group: "Stewards Tribune", title: "Zuid tribune bewaking", location: "Zuid tribune", spots: 5, startH: 0, endH: 3 },
      { group: "Stewards Tribune", title: "Hoofdtribune bewaking", location: "Hoofdtribune", spots: 3, startH: 0, endH: 3 },
      // Parking — 5 spots
      { group: "Parking", title: "Parking A begeleiding", location: "Parking A", spots: 3, startH: -1, endH: 1 },
      { group: "Parking", title: "Parking B begeleiding", location: "Parking B", spots: 2, startH: -1, endH: 1 },
      // Catering — 6 spots
      { group: "Catering", title: "Drankbar hoofdtribune", location: "Hoofdtribune bar", spots: 3, startH: 0, endH: 4 },
      { group: "Catering", title: "Foodtruck esplanade", location: "Esplanade", spots: 3, startH: -1, endH: 4 },
      // EHBO — 3 spots
      { group: "EHBO", title: "EHBO-post standby", location: "Medische post", spots: 2, startH: 0, endH: 3 },
      { group: "EHBO", title: "EHBO mobiel team", location: "Rondlopend", spots: 1, startH: 0, endH: 3 },
      // Security — 5 spots
      { group: "Security", title: "Toegangscontrole Noord", location: "Ingang Noord", spots: 3, startH: -1, endH: 2 },
      { group: "Security", title: "Toegangscontrole Zuid", location: "Ingang Zuid", spots: 2, startH: -1, endH: 2 },
      // VIP — 4 spots
      { group: "VIP & Ontvangst", title: "VIP-lounge ontvangst", location: "VIP-zone", spots: 2, startH: -1, endH: 3 },
      { group: "VIP & Ontvangst", title: "Sponsors begeleiding", location: "Tribune lounge", spots: 2, startH: 0, endH: 3 },
    ];
    // Total spots: 4+5+3+3+2+3+3+2+1+3+2+2+2 = 35

    // The volunteer test account is assigned to "Zuid tribune bewaking" (full zuid tribune)
    const testAccountTask = "Zuid tribune bewaking";

    const insertedTasks: any[] = [];
    for (const td of taskDefs) {
      const start = new Date(now.getTime() + td.startH * 3600000);
      const end = new Date(now.getTime() + td.endH * 3600000);
      const briefing = new Date(start.getTime() - 30 * 60000);

      const { data: task } = await supabase.from("tasks").insert({
        club_id, event_id: eventId, event_group_id: groupMap[td.group],
        title: td.title, location: td.location, spots_available: td.spots,
        task_date: start.toISOString(), start_time: start.toISOString(),
        end_time: end.toISOString(), briefing_time: briefing.toISOString(),
        status: "open", compensation_type: "fixed", hourly_rate: 5,
        estimated_hours: td.endH - td.startH,
      }).select("id, title").single();

      if (task) insertedTasks.push({ ...task, group: td.group, spots: td.spots });
    }

    // ── Assign volunteers (30 out of 35 spots filled) ──
    let dummyIdx = 0;
    const taskVolunteerMap: Record<string, string[]> = {};
    const unfilledSpots = 5; // 5 spots stay empty
    let spotsSkipped = 0;

    for (const task of insertedTasks) {
      const vols: string[] = [];
      const isTestTask = task.title === testAccountTask;

      // Assign test account to Zuid tribune
      if (isTestTask && testVolunteerId) {
        await supabase.from("task_signups").insert({ task_id: task.id, volunteer_id: testVolunteerId, status: "assigned" });
        vols.push(testVolunteerId);
      }

      // Fill remaining spots (leave some empty for the 30/35 ratio)
      const alreadyAssigned = isTestTask && testVolunteerId ? 1 : 0;
      const totalSpotsForTask = task.spots - alreadyAssigned;

      for (let i = 0; i < totalSpotsForTask; i++) {
        // Skip some spots to reach 30/35 filled (skip 5 total across all tasks)
        if (spotsSkipped < unfilledSpots && dummyIds.length > 0) {
          // Skip one spot per task for the last few tasks
          const remainingTasks = insertedTasks.length - insertedTasks.indexOf(task);
          if (remainingTasks <= unfilledSpots - spotsSkipped) {
            spotsSkipped++;
            continue;
          }
        }

        if (dummyIds.length === 0) break;
        const vid = dummyIds[dummyIdx % dummyIds.length];
        dummyIdx++;
        const { error } = await supabase.from("task_signups").insert({ task_id: task.id, volunteer_id: vid, status: "assigned" });
        if (!error) vols.push(vid);
      }
      taskVolunteerMap[task.id] = vols;
    }

    // ── Safety zones ──
    const zoneGroupMap: Record<string, string> = {
      "Noord Tribune": "Stewards Tribune",
      "Zuid Tribune": "Stewards Tribune",
      "Hoofdtribune": "Stewards Tribune",
      "Parking": "Parking",
      "Esplanade": "Catering",
      "Ingang Noord": "Security",
      "Ingang Zuid": "Security",
      "VIP-zone": "VIP & Ontvangst",
    };

    const safetyZoneDefs = [
      { name: "Noord Tribune", color: "#3b82f6" },
      { name: "Zuid Tribune", color: "#06b6d4" },
      { name: "Hoofdtribune", color: "#22c55e" },
      { name: "Parking", color: "#f59e0b" },
      { name: "Esplanade", color: "#8b5cf6" },
      { name: "Ingang Noord", color: "#ec4899" },
      { name: "Ingang Zuid", color: "#f97316" },
      { name: "VIP-zone", color: "#e11d48" },
    ];

    const { data: zones } = await supabase
      .from("safety_zones")
      .insert(safetyZoneDefs.map((z, i) => ({
        event_id: eventId, club_id, name: z.name, color: z.color, sort_order: i, status: "normal",
        event_group_id: groupMap[zoneGroupMap[z.name]] || null,
        checklist_active: true,
      })))
      .select("id, name");

    const zoneMap: Record<string, string> = {};
    zones?.forEach((z: any) => { zoneMap[z.name] = z.id; });

    // ── Incident types (idempotent) ──
    const typesDef = [
      { label: "Medisch", icon: "Heart", color: "#ef4444", default_priority: "medium" },
      { label: "Brand", icon: "Flame", color: "#f97316", default_priority: "high" },
      { label: "Agressie", icon: "ShieldAlert", color: "#dc2626", default_priority: "high" },
      { label: "Diefstal", icon: "Lock", color: "#6366f1", default_priority: "low" },
      { label: "Evacuatie", icon: "LogOut", color: "#eab308", default_priority: "high" },
      { label: "Verdacht pakket", icon: "Package", color: "#7c3aed", default_priority: "high" },
    ];

    const { data: existingTypes } = await supabase.from("safety_incident_types").select("label").eq("club_id", club_id);
    const existingLabels = new Set((existingTypes || []).map((t: any) => t.label));
    const newTypes = typesDef.filter(t => !existingLabels.has(t.label));
    if (newTypes.length > 0) {
      await supabase.from("safety_incident_types").insert(newTypes.map((t, i) => ({ club_id, ...t, sort_order: (existingTypes?.length || 0) + i })));
    }

    const { data: finalTypes } = await supabase.from("safety_incident_types").select("id, label").eq("club_id", club_id);
    const typeMap: Record<string, string> = {};
    finalTypes?.forEach((t: any) => { typeMap[t.label] = t.id; });

    // ── Checklist items per zone ──
    const checklistPerZone: Record<string, string[]> = {
      "Noord Tribune": ["Zitjes gecontroleerd op schade", "Nooduitgangen vrij en gemarkeerd", "Camera's operationeel"],
      "Zuid Tribune": ["Zitjes gecontroleerd", "Nooduitgangen vrij", "Stewards op positie", "Hekwerk geïnspecteerd"],
      "Hoofdtribune": ["Tribunes schoongemaakt", "Noodverlichting getest", "Geluidsinstallatie getest"],
      "Parking": ["Verkeersroutes gemarkeerd", "Brandblussers gecontroleerd", "Parkeerplaatsen aangeduid"],
      "Esplanade": ["Foodtrucks gekeurd", "Looppaden vrij", "Afvalbakken geplaatst"],
      "Ingang Noord": ["Fouilleerteam gebrieft", "Detectiepoorten getest", "Wachtlijnen opgesteld"],
      "Ingang Zuid": ["Scanners getest", "Nooduitgang gemarkeerd", "Signalisatie geplaatst"],
      "VIP-zone": ["AED-locatie gemarkeerd", "Bar & catering klaar", "Gastenlijst gecontroleerd"],
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

    // ═══════════════════════════════════════════
    // Return immediately, run simulation in background
    // ═══════════════════════════════════════════
    const totalAssigned = Object.values(taskVolunteerMap).flat().length;
    const response = new Response(
      JSON.stringify({
        event_id: eventId,
        tasks_created: insertedTasks.length,
        volunteers_assigned: totalAssigned,
        total_spots: 35,
        test_account_assigned: testVolunteerId ? "Zuid tribune bewaking" : "Test account niet gevonden",
        message: `Simulatie gestart! ${totalAssigned}/35 vrijwilligers ingeschreven. Checklists worden de komende minuut voltooid (behalve Zuid Tribune). Klik daarna op GO LIVE om incidenten te triggeren.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // ═══════════════════════════════════════════
    // BACKGROUND SIMULATION (~5 min max)
    // ═══════════════════════════════════════════
    (async () => {
      const allDummyVols = dummyIds.slice(0, 20);
      const randomDummy = () => allDummyVols[Math.floor(Math.random() * allDummyVols.length)] || user.id;

      // Determine which checklist items belong to the test account's zone (Zuid Tribune) — leave those for manual testing
      const testZoneId = zoneMap["Zuid Tribune"];
      const dummyChecklistIds = (insertedChecklist || [])
        .filter((ci: any) => ci.zone_id !== testZoneId)
        .map((ci: any) => ci.id);

      // ── Phase 1 (0-60s): Complete all checklists EXCEPT Zuid Tribune ──
      if (dummyChecklistIds.length > 0) {
        const delay = Math.floor(60000 / dummyChecklistIds.length);
        for (const cid of dummyChecklistIds) {
          await new Promise(r => setTimeout(r, delay));
          try {
            await supabase.from("safety_checklist_progress").insert({
              checklist_item_id: cid,
              volunteer_id: randomDummy(),
              is_completed: true,
              completed_at: new Date().toISOString(),
            });
          } catch (e) { console.error("Checklist err:", e); }
        }
      }

      // ── Phase 2: Wait for GO LIVE (poll every 5s, max 3 min) ──
      let liveDetected = false;
      for (let i = 0; i < 36; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: ev } = await supabase.from("events").select("is_live").eq("id", eventId).single();
        if (ev?.is_live) { liveDetected = true; break; }
      }

      if (!liveDetected) {
        console.log("GO LIVE niet gedetecteerd binnen 3 minuten, simulatie gestopt.");
        return;
      }

      // ── Phase 3 (after GO LIVE): Simulate activity ──

      // 3a: Dummy volunteers report hour confirmations
      const dummyTaskIds = insertedTasks
        .filter(t => t.title !== testAccountTask)
        .map(t => t.id);

      for (const taskId of dummyTaskIds) {
        const vols = (taskVolunteerMap[taskId] || []).filter(v => v !== user.id && v !== testVolunteerId);
        for (const vid of vols.slice(0, 2)) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            await supabase.from("hour_confirmations").insert({
              task_id: taskId,
              volunteer_id: vid,
              volunteer_reported_hours: 3 + Math.floor(Math.random() * 3),
              volunteer_approved: true,
              status: "volunteer_reported",
            });
          } catch (e) { console.error("Hour confirm err:", e); }
        }
      }

      // 3b: Simulate 10 incidents over ~2 minutes (some near Zuid Tribune for testing)
      const incidents = [
        { delay: 5000, type: "Medisch", zone: "Noord Tribune", priority: "medium", desc: "Bezoeker flauwgevallen bij rij 12", lat: 50.8558, lng: 3.3070 },
        { delay: 10000, type: "Diefstal", zone: "Parking", priority: "low", desc: "Gestolen rugzak gemeld bij parking A", lat: 50.8545, lng: 3.3055 },
        { delay: 10000, type: "Agressie", zone: "Zuid Tribune", priority: "high", desc: "Vechtpartij in vak Z3 — stewards ter plaatse", lat: 50.8555, lng: 3.3075 },
        { delay: 12000, type: "Medisch", zone: "Esplanade", priority: "medium", desc: "Snijwond bij vrijwilliger foodtruck", lat: 50.8550, lng: 3.3065 },
        { delay: 10000, type: "Verdacht pakket", zone: "Zuid Tribune", priority: "high", desc: "Onbeheerde tas onder zitplaats Z14", lat: 50.8556, lng: 3.3076 },
        { delay: 12000, type: "Brand", zone: "Esplanade", priority: "high", desc: "Rookontwikkeling bij foodtruck zone C", lat: 50.8548, lng: 3.3060 },
        { delay: 10000, type: "Agressie", zone: "Ingang Noord", priority: "medium", desc: "Verbale escalatie bij toegangscontrole", lat: 50.8563, lng: 3.3080 },
        { delay: 10000, type: "Medisch", zone: "Zuid Tribune", priority: "medium", desc: "Hyperventilatie bij bezoeker vak Z7", lat: 50.8554, lng: 3.3074 },
        { delay: 12000, type: "Evacuatie", zone: "Noord Tribune", priority: "high", desc: "Gedeeltelijke evacuatie noord vereist", lat: 50.8557, lng: 3.3088 },
        { delay: 10000, type: "Diefstal", zone: "VIP-zone", priority: "low", desc: "Portefeuille vermist bij VIP-bar", lat: 50.8560, lng: 3.3072 },
      ];

      for (const inc of incidents) {
        await new Promise(r => setTimeout(r, inc.delay));
        try {
          await supabase.from("safety_incidents").insert({
            event_id: eventId, club_id,
            incident_type_id: typeMap[inc.type] || null,
            zone_id: zoneMap[inc.zone] || null,
            reporter_id: randomDummy(),
            description: inc.desc,
            priority: inc.priority,
            status: "nieuw",
            lat: inc.lat,
            lng: inc.lng,
          });
        } catch (e) { console.error("Incident err:", e); }
      }

      // 3c: Some dummies complete their signups
      await new Promise(r => setTimeout(r, 5000));
      for (const taskId of dummyTaskIds.slice(0, 3)) {
        const vols = (taskVolunteerMap[taskId] || []).filter(v => v !== user.id && v !== testVolunteerId);
        for (const vid of vols.slice(0, 1)) {
          try {
            await supabase.from("task_signups").update({ status: "completed" }).eq("task_id", taskId).eq("volunteer_id", vid);
          } catch (e) { console.error("Signup update err:", e); }
        }
      }

      console.log("Simulatie voltooid!");
    })();

    return response;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
