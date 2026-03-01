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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { club_id, action } = await req.json();
    if (!club_id) throw new Error("club_id required");

    // ── DELETE MODE ──
    if (action === "delete") {
      // Find demo event
      const { data: demoEvents } = await supabase
        .from("events")
        .select("id")
        .eq("club_id", club_id)
        .eq("title", "Demo Voetbalwedstrijd 2026");

      if (!demoEvents?.length) {
        return new Response(JSON.stringify({ message: "Geen demo data gevonden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const ev of demoEvents) {
        // Delete zone assignments & zones for tasks in this event
        const { data: eventTasks } = await supabase.from("tasks").select("id").eq("event_id", ev.id);
        const taskIds = (eventTasks || []).map((t: any) => t.id);

        if (taskIds.length) {
          // Get zone ids
          const { data: zones } = await supabase.from("task_zones").select("id").in("task_id", taskIds);
          const zoneIds = (zones || []).map((z: any) => z.id);
          if (zoneIds.length) {
            await supabase.from("task_zone_assignments").delete().in("zone_id", zoneIds);
          }
          await supabase.from("task_zones").delete().in("task_id", taskIds);
          await supabase.from("task_signups").delete().in("task_id", taskIds);
          await supabase.from("tasks").delete().in("id", taskIds);
        }

        // Delete event groups
        await supabase.from("event_groups").delete().eq("event_id", ev.id);
        // Delete event
        await supabase.from("events").delete().eq("id", ev.id);
      }

      // Delete demo profiles
      const demoNames = [
        "Jan Peeters", "Marie Janssens", "Pieter De Smet", "An Willems",
        "Tom Claes", "Eva Martens", "Koen Jacobs", "Lisa Vermeersch",
        "Bart Wouters", "Sara Maes", "Nico Van Damme", "Julie Hermans",
        "Kevin Mertens", "Sofie De Wolf", "Jens Vandenberghe", "Laura Peeters",
        "Wout Stevens", "Eline Bogaert", "Robbe Lenaerts", "Charlotte Devos",
      ];
      for (const name of demoNames) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("full_name", name).maybeSingle();
        if (profile) {
          await supabase.auth.admin.deleteUser(profile.id);
        }
      }

      return new Response(JSON.stringify({ message: "Demo data verwijderd!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE MODE ──
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 14); // 2 weeks from now

    // Step 1: Create demo event
    const { data: event, error: evErr } = await supabase
      .from("events")
      .insert({
        club_id,
        title: "Demo Voetbalwedstrijd 2026",
        description: "Automatisch gegenereerd demo-scenario om de volledige planning-flow te testen: groepen, taken, zones, vrijwilligers en toewijzingen.",
        event_date: eventDate.toISOString(),
        location: "Demo Stadion, Brussel",
        status: "open",
        event_type: "event",
      })
      .select("id")
      .single();
    if (evErr) throw evErr;
    const eventId = event.id;

    // Step 2: Create event groups
    const groupDefs = [
      { name: "Stewards", color: "#3b82f6", wristband_color: "Blauw", wristband_label: "STEWARD", materials_note: "Fluohesje maat L/XL, oortje, walkietalkie" },
      { name: "Parking", color: "#f59e0b", wristband_color: "Geel", wristband_label: "PARKING", materials_note: "Fluohesje, zaklamp, parkeerborden" },
      { name: "Catering", color: "#10b981", wristband_color: "Groen", wristband_label: "CATERING", materials_note: "Schort, handschoenen, bonnenblok" },
      { name: "Ticketing & Onthaal", color: "#8b5cf6", wristband_color: "Paars", wristband_label: "ONTHAAL", materials_note: "Tablet, scanner, gastenvlijst" },
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

    // Step 3: Create tasks per group
    const taskStartBase = new Date(eventDate);
    taskStartBase.setHours(12, 0, 0, 0);

    const taskDefs = [
      // Stewards
      { group: "Stewards", title: "Toegangscontrole Noord", location: "Ingang Noord", spots: 6, startH: 12, endH: 18 },
      { group: "Stewards", title: "Toegangscontrole Zuid", location: "Ingang Zuid", spots: 4, startH: 12, endH: 18 },
      { group: "Stewards", title: "Tribune bewaking", location: "Hoofdtribune", spots: 8, startH: 13, endH: 17 },
      // Parking
      { group: "Parking", title: "Parking P1 begeleiding", location: "Parking P1", spots: 4, startH: 10, endH: 14 },
      { group: "Parking", title: "Parking P2 begeleiding", location: "Parking P2", spots: 3, startH: 10, endH: 14 },
      // Catering
      { group: "Catering", title: "Bar VIP-lounge", location: "VIP Lounge", spots: 3, startH: 14, endH: 20 },
      { group: "Catering", title: "Foodtruck zone", location: "Esplanade", spots: 5, startH: 11, endH: 19 },
      // Ticketing
      { group: "Ticketing & Onthaal", title: "Ticket scanning", location: "Hoofdingang", spots: 4, startH: 11, endH: 15 },
      { group: "Ticketing & Onthaal", title: "VIP-onthaal", location: "VIP Ingang", spots: 2, startH: 12, endH: 15 },
    ];

    const insertedTasks: any[] = [];
    for (const td of taskDefs) {
      const start = new Date(taskStartBase);
      start.setHours(td.startH, 0, 0, 0);
      const end = new Date(taskStartBase);
      end.setHours(td.endH, 0, 0, 0);
      const briefing = new Date(start);
      briefing.setMinutes(briefing.getMinutes() - 30);

      const { data: task } = await supabase.from("tasks").insert({
        club_id,
        event_id: eventId,
        event_group_id: groupMap[td.group],
        title: td.title,
        location: td.location,
        spots_available: td.spots,
        task_date: start.toISOString(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        briefing_time: briefing.toISOString(),
        status: "open",
        compensation_type: "fixed",
        hourly_rate: 5,
        estimated_hours: td.endH - td.startH,
      }).select("id, title").single();

      if (task) insertedTasks.push({ ...task, group: td.group, spots: td.spots });
    }

    // Step 4: Create zone tree per task
    // Each task gets: 2-3 zones, some with sub-zones (posts)
    const zoneTemplates: Record<string, { name: string; capacity: number; children?: { name: string; capacity: number }[] }[]> = {
      "Toegangscontrole Noord": [
        { name: "Poort A", capacity: 2, children: [{ name: "Post A1 - Links", capacity: 1 }, { name: "Post A2 - Rechts", capacity: 1 }] },
        { name: "Poort B", capacity: 2, children: [{ name: "Post B1 - Links", capacity: 1 }, { name: "Post B2 - Rechts", capacity: 1 }] },
        { name: "Reservepost", capacity: 2 },
      ],
      "Toegangscontrole Zuid": [
        { name: "Poort C", capacity: 2 },
        { name: "Poort D", capacity: 2 },
      ],
      "Tribune bewaking": [
        { name: "Sectie A (rij 1-10)", capacity: 2 },
        { name: "Sectie B (rij 11-20)", capacity: 3 },
        { name: "Sectie C (rij 21-30)", capacity: 3 },
      ],
      "Parking P1 begeleiding": [
        { name: "Inrit P1", capacity: 2 },
        { name: "Uitrit P1", capacity: 2 },
      ],
      "Parking P2 begeleiding": [
        { name: "Inrit P2", capacity: 1 },
        { name: "Zone handicap", capacity: 1 },
        { name: "Uitrit P2", capacity: 1 },
      ],
      "Bar VIP-lounge": [
        { name: "Bar links", capacity: 1 },
        { name: "Bar rechts", capacity: 1 },
        { name: "Afwas", capacity: 1 },
      ],
      "Foodtruck zone": [
        { name: "Truck 1 - Frietjes", capacity: 2 },
        { name: "Truck 2 - Hamburgers", capacity: 2 },
        { name: "Loopverkoop", capacity: 1 },
      ],
      "Ticket scanning": [
        { name: "Lijn 1", capacity: 1 },
        { name: "Lijn 2", capacity: 1 },
        { name: "Lijn 3", capacity: 1 },
        { name: "Supervisie", capacity: 1 },
      ],
      "VIP-onthaal": [
        { name: "Registratie desk", capacity: 1 },
        { name: "Begeleiding naar lounge", capacity: 1 },
      ],
    };

    // Insert zones
    const allLeafZones: { id: string; taskId: string; capacity: number }[] = [];

    for (const task of insertedTasks) {
      const template = zoneTemplates[task.title] || [];
      let sortIdx = 0;
      for (const zone of template) {
        const { data: parentZone } = await supabase.from("task_zones").insert({
          task_id: task.id, name: zone.name, max_capacity: zone.capacity,
          sort_order: sortIdx++, is_visible: true, parent_id: null,
        }).select("id").single();

        if (parentZone && zone.children?.length) {
          for (let ci = 0; ci < zone.children.length; ci++) {
            const child = zone.children[ci];
            const { data: childZone } = await supabase.from("task_zones").insert({
              task_id: task.id, name: child.name, max_capacity: child.capacity,
              sort_order: ci, is_visible: true, parent_id: parentZone.id,
            }).select("id").single();
            if (childZone) allLeafZones.push({ id: childZone.id, taskId: task.id, capacity: child.capacity });
          }
        } else if (parentZone) {
          allLeafZones.push({ id: parentZone.id, taskId: task.id, capacity: zone.capacity });
        }
      }
    }

    // Step 5: Create 20 fake volunteer profiles
    const volunteerDefs = [
      { name: "Jan Peeters", email: "demo-jan@playmaker.test" },
      { name: "Marie Janssens", email: "demo-marie@playmaker.test" },
      { name: "Pieter De Smet", email: "demo-pieter@playmaker.test" },
      { name: "An Willems", email: "demo-an@playmaker.test" },
      { name: "Tom Claes", email: "demo-tom@playmaker.test" },
      { name: "Eva Martens", email: "demo-eva@playmaker.test" },
      { name: "Koen Jacobs", email: "demo-koen@playmaker.test" },
      { name: "Lisa Vermeersch", email: "demo-lisa@playmaker.test" },
      { name: "Bart Wouters", email: "demo-bart@playmaker.test" },
      { name: "Sara Maes", email: "demo-sara@playmaker.test" },
      { name: "Nico Van Damme", email: "demo-nico@playmaker.test" },
      { name: "Julie Hermans", email: "demo-julie@playmaker.test" },
      { name: "Kevin Mertens", email: "demo-kevin@playmaker.test" },
      { name: "Sofie De Wolf", email: "demo-sofie@playmaker.test" },
      { name: "Jens Vandenberghe", email: "demo-jens@playmaker.test" },
      { name: "Laura Peeters", email: "demo-laura@playmaker.test" },
      { name: "Wout Stevens", email: "demo-wout@playmaker.test" },
      { name: "Eline Bogaert", email: "demo-eline@playmaker.test" },
      { name: "Robbe Lenaerts", email: "demo-robbe@playmaker.test" },
      { name: "Charlotte Devos", email: "demo-charlotte@playmaker.test" },
    ];

    const volunteerIds: string[] = [];
    for (const v of volunteerDefs) {
      const { data: existing } = await supabase.from("profiles").select("id").eq("full_name", v.name).maybeSingle();
      if (existing) {
        volunteerIds.push(existing.id);
        continue;
      }

      const password = `Demo2026!${Math.random().toString(36).slice(2, 8)}`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: v.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: v.name },
      });

      if (authError) {
        const { data: profiles } = await supabase.from("profiles").select("id").eq("email", v.email).maybeSingle();
        if (profiles) volunteerIds.push(profiles.id);
        continue;
      }
      if (authData.user) volunteerIds.push(authData.user.id);
    }

    // Step 6: Create task_signups — fill most spots per task
    const taskSignupMap: Record<string, string[]> = {};
    let volIdx = 0;
    for (const task of insertedTasks) {
      const count = Math.min(task.spots, Math.max(3, task.spots - 1)); // Fill almost all spots
      const signedUp: string[] = [];
      for (let i = 0; i < count; i++) {
        const vid = volunteerIds[volIdx % volunteerIds.length];
        volIdx++;
        const { error } = await supabase.from("task_signups").insert({
          task_id: task.id,
          volunteer_id: vid,
          status: "assigned",
        });
        if (!error) signedUp.push(vid);
      }
      taskSignupMap[task.id] = signedUp;
    }

    // Step 7: Assign volunteers to zones — ~75% filled, using only volunteers signed up to that task
    let assignIdx = 0;
    for (const zone of allLeafZones) {
      if (Math.random() > 0.75) continue; // skip ~25% for realism
      const taskVolunteers = taskSignupMap[zone.taskId] || [];
      if (!taskVolunteers.length) continue;
      const vid = taskVolunteers[assignIdx % taskVolunteers.length];
      assignIdx++;
      await supabase.from("task_zone_assignments").insert({
        zone_id: zone.id,
        volunteer_id: vid,
        assigned_by: user.id,
      });
    }

    return new Response(
      JSON.stringify({
        event_id: eventId,
        tasks_created: insertedTasks.length,
        zones_created: allLeafZones.length,
        volunteers_created: volunteerIds.length,
        message: "Demo voetbalwedstrijd aangemaakt! Verken de planning, zones en toewijzingen.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
