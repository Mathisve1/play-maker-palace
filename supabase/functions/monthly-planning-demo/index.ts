import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_PLAN_TITLE = "Demo Maandplan";

// ── Task templates: realistic Belgian club daily operations ──
const TASK_TEMPLATES = [
  { title: "Bar openen", category: "Bar", location: "Clubhuis", startH: 14, endH: 22, spots: 3, comp: "daily", daily: 25 },
  { title: "Kantine middag", category: "Kantine", location: "Kantine", startH: 11, endH: 14, spots: 2, comp: "daily", daily: 20 },
  { title: "Velden klaarzetten", category: "Logistiek", location: "Sportveld", startH: 8, endH: 10, spots: 2, comp: "hourly", hourly: 5, estH: 2 },
  { title: "Jeugdtraining begeleiding", category: "Jeugdwerking", location: "Veld 2", startH: 14, endH: 17, spots: 4, comp: "daily", daily: 25 },
  { title: "Schoonmaak kleedkamers", category: "Schoonmaak", location: "Kleedkamers", startH: 20, endH: 22, spots: 2, comp: "hourly", hourly: 5, estH: 2 },
  { title: "Catering wedstrijd", category: "Catering", location: "VIP-lounge", startH: 12, endH: 18, spots: 3, comp: "daily", daily: 30 },
  { title: "Administratie secretariaat", category: "Administratie", location: "Kantoor", startH: 9, endH: 12, spots: 1, comp: "daily", daily: 20 },
  { title: "Parking begeleiding", category: "Logistiek", location: "Parking P1", startH: 13, endH: 17, spots: 3, comp: "daily", daily: 25 },
  { title: "Onderhoud terreinen", category: "Onderhoud", location: "Complex", startH: 8, endH: 12, spots: 2, comp: "hourly", hourly: 5, estH: 4 },
  { title: "Avondevenement bar", category: "Evenement", location: "Feestzaal", startH: 18, endH: 23, spots: 4, comp: "daily", daily: 30 },
];

// Days of the week each task runs (0=Mon..6=Sun)
const TASK_SCHEDULE: Record<string, number[]> = {
  "Bar openen": [2, 4, 5, 6],           // Wed, Fri, Sat, Sun
  "Kantine middag": [5, 6],              // Sat, Sun
  "Velden klaarzetten": [5, 6],          // Sat, Sun
  "Jeugdtraining begeleiding": [2, 3],   // Wed, Thu
  "Schoonmaak kleedkamers": [0, 2, 4],   // Mon, Wed, Fri
  "Catering wedstrijd": [6],             // Sun
  "Administratie secretariaat": [1, 3],   // Tue, Thu
  "Parking begeleiding": [6],            // Sun
  "Onderhoud terreinen": [0, 4],         // Mon, Fri
  "Avondevenement bar": [5],             // Sat
};

// Demo volunteer names (reused from planning-demo)
const VOLUNTEER_NAMES = [
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

    // ══════════════════════════════════════════════
    // DELETE MODE
    // ══════════════════════════════════════════════
    if (action === "delete") {
      // Find demo plans
      const { data: demoPlans } = await supabase
        .from("monthly_plans")
        .select("id")
        .eq("club_id", club_id)
        .like("title", `${DEMO_PLAN_TITLE}%`);

      if (!demoPlans?.length) {
        return new Response(JSON.stringify({ message: "Geen demo maandplan gevonden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const plan of demoPlans) {
        // Delete day signups via enrollments
        const { data: enrollments } = await supabase
          .from("monthly_enrollments")
          .select("id")
          .eq("plan_id", plan.id);
        const enrollIds = (enrollments || []).map((e: any) => e.id);
        if (enrollIds.length) {
          await supabase.from("monthly_day_signups").delete().in("enrollment_id", enrollIds);
        }

        // Delete payouts
        await supabase.from("monthly_payouts").delete().eq("plan_id", plan.id);

        // Delete enrollments
        await supabase.from("monthly_enrollments").delete().eq("plan_id", plan.id);

        // Delete tasks
        await supabase.from("monthly_plan_tasks").delete().eq("plan_id", plan.id);

        // Delete plan
        await supabase.from("monthly_plans").delete().eq("id", plan.id);
      }

      // Delete demo contract template
      await supabase.from("contract_templates").delete()
        .eq("club_id", club_id)
        .eq("name", "Demo Maandcontract Vrijwilliger");

      return new Response(JSON.stringify({ message: "Demo maandplan verwijderd!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════════
    // CREATE MODE
    // ══════════════════════════════════════════════
    const now = new Date();
    const planMonth = now.getMonth() + 1; // 1-based
    const planYear = now.getFullYear();

    // Step 1: Create a demo contract template (Belgian-compliant)
    const contractBlocks = [
      {
        id: "h1", type: "heading", content: "Maandovereenkomst Vrijwilligerswerk",
        style: { fontSize: 22, color: "#1a1a1a", textAlign: "center", bold: true, italic: false, underline: false },
      },
      {
        id: "a1", type: "article", articleId: "clausule_maand_duur", articleTitle: "Artikel 1 – Duur & Periode",
        content: "Deze overeenkomst geldt voor de maand {{Maandperiode}}, van {{Startdatum}} tot en met {{Einddatum}}. De vrijwilliger verbindt zich om beschikbaar te zijn voor de geplande taken binnen deze periode.",
        style: { fontSize: 12, color: "#333", textAlign: "justify", bold: false, italic: false, underline: false },
      },
      {
        id: "a2", type: "article", articleId: "clausule_maand_dagplanning", articleTitle: "Artikel 2 – Dagplanning & Registratie",
        content: "De vrijwilliger meldt zich aan voor specifieke dagdelen via het digitaal platform. Aanwezigheid wordt geregistreerd via barcodescan bij aankomst. Enkel geregistreerde aanwezigheden komen in aanmerking voor vergoeding.",
        style: { fontSize: 12, color: "#333", textAlign: "justify", bold: false, italic: false, underline: false },
      },
      {
        id: "a3", type: "article", articleId: "clausule_maand_vergoeding", articleTitle: "Artikel 3 – Kostenvergoeding",
        content: "De vrijwilliger ontvangt een kostenvergoeding van {{Dagvergoeding}} per dag of {{Uurvergoeding}} per uur, afhankelijk van de taak. De vergoeding respecteert de wettelijke plafonds: max. {{MaxDagPlafond}} per dag en max. {{MaxJaarPlafond}} per jaar (art. 10 Vrijwilligerswet 2005).",
        style: { fontSize: 12, color: "#333", textAlign: "justify", bold: false, italic: false, underline: false },
      },
      {
        id: "a4", type: "article", articleId: "clausule_maand_afrekening", articleTitle: "Artikel 4 – Maandelijkse Afrekening",
        content: "Op het einde van de maand wordt een gebundelde afrekening opgemaakt. De uitbetaling gebeurt via overschrijving op rekeningnummer {{IBAN}} t.n.v. {{Rekeninghouder}} binnen 15 werkdagen na het einde van de maand.",
        style: { fontSize: 12, color: "#333", textAlign: "justify", bold: false, italic: false, underline: false },
      },
      {
        id: "a5", type: "article", articleId: "clausule_maand_cumul", articleTitle: "Artikel 5 – Cumulatie & Fiscaliteit",
        content: "De vrijwilliger verklaart geen andere vrijwilligersvergoedingen te ontvangen die het wettelijk jaarplafond ({{MaxJaarPlafond}}) overschrijden. Bij overschrijding dient de vrijwilliger de organisatie onmiddellijk te verwittigen. De vrijwilliger die een RVA/ONEM-uitkering ontvangt, dient voorafgaand een aangifte te doen bij de RVA (formulier C45B).",
        style: { fontSize: 12, color: "#333", textAlign: "justify", bold: false, italic: false, underline: false },
      },
      {
        id: "a6", type: "article", articleId: "clausule_maand_gdpr", articleTitle: "Artikel 6 – Privacy (GDPR)",
        content: "Persoonsgegevens worden verwerkt conform de AVG/GDPR en bewaard gedurende maximaal 7 jaar na afloop van het kalenderjaar. De vrijwilliger heeft recht op inzage, correctie en verwijdering van de gegevens.",
        style: { fontSize: 12, color: "#333", textAlign: "justify", bold: false, italic: false, underline: false },
      },
      {
        id: "a7", type: "article", articleId: "clausule_maand_id", articleTitle: "Artikel 7 – Identificatie Vrijwilliger",
        content: "Naam: {{Naam}}\nGeboortedatum: {{Geboortedatum}}\nRijksregisternummer: {{Rijksregisternummer}}\nAdres: {{Adres}}\nE-mail: {{E-mail}}\nTelefoon: {{Telefoon}}",
        style: { fontSize: 12, color: "#333", textAlign: "left", bold: false, italic: false, underline: false },
      },
      {
        id: "s1", type: "signature", content: "Handtekening vrijwilliger",
        style: { fontSize: 12, color: "#333", textAlign: "center", bold: false, italic: false, underline: false },
      },
    ];

    // Upsert contract template
    const { data: existingTemplate } = await supabase
      .from("contract_templates")
      .select("id")
      .eq("club_id", club_id)
      .eq("name", "Demo Maandcontract Vrijwilliger")
      .maybeSingle();

    let templateId: string;
    if (existingTemplate) {
      templateId = existingTemplate.id;
      await supabase.from("contract_templates").update({
        template_data: contractBlocks,
      }).eq("id", templateId);
    } else {
      const { data: newTemplate, error: tplErr } = await supabase
        .from("contract_templates")
        .insert({
          club_id,
          name: "Demo Maandcontract Vrijwilliger",
          created_by: user.id,
          docuseal_template_id: 0,
          template_data: contractBlocks,
        })
        .select("id")
        .single();
      if (tplErr) throw tplErr;
      templateId = newTemplate.id;
    }

    // Step 2: Create the monthly plan (delete ALL existing plans for same club/year/month first)
    const { data: existingPlans } = await supabase
      .from("monthly_plans")
      .select("id")
      .eq("club_id", club_id)
      .eq("year", planYear)
      .eq("month", planMonth);

    for (const ep of (existingPlans || [])) {
      const { data: oldEnrollments } = await supabase.from("monthly_enrollments").select("id").eq("plan_id", ep.id);
      const oldEnrIds = (oldEnrollments || []).map((e: any) => e.id);
      if (oldEnrIds.length) await supabase.from("monthly_day_signups").delete().in("enrollment_id", oldEnrIds);
      await supabase.from("monthly_payouts").delete().eq("plan_id", ep.id);
      await supabase.from("monthly_enrollments").delete().eq("plan_id", ep.id);
      await supabase.from("monthly_plan_tasks").delete().eq("plan_id", ep.id);
      await supabase.from("monthly_plans").delete().eq("id", ep.id);
    }

    const { data: plan, error: planErr } = await supabase
      .from("monthly_plans")
      .insert({
        club_id,
        year: planYear,
        month: planMonth,
        title: `${DEMO_PLAN_TITLE} – ${planMonth}/${planYear}`,
        description: "Automatisch gegenereerd demo-maandplan met taken, contracten en vrijwilligers.",
        created_by: user.id,
        status: "published",
        contract_template_id: templateId,
      })
      .select("id")
      .single();
    if (planErr) throw planErr;

    // Step 3: Generate tasks for every matching weekday in the month
    const daysInMonth = new Date(planYear, planMonth, 0).getDate();
    const taskInserts: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(planYear, planMonth - 1, day);
      const dow = date.getDay(); // 0=Sun
      const mondayIdx = dow === 0 ? 6 : dow - 1; // 0=Mon

      for (const tpl of TASK_TEMPLATES) {
        const schedule = TASK_SCHEDULE[tpl.title];
        if (!schedule || !schedule.includes(mondayIdx)) continue;

        const dateStr = `${planYear}-${String(planMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        taskInserts.push({
          plan_id: plan.id,
          task_date: dateStr,
          title: tpl.title,
          category: tpl.category,
          location: tpl.location,
          start_time: `${String(tpl.startH).padStart(2, "0")}:00`,
          end_time: `${String(tpl.endH).padStart(2, "0")}:00`,
          spots_available: tpl.spots,
          compensation_type: tpl.comp,
          daily_rate: tpl.comp === "daily" ? tpl.daily : null,
          hourly_rate: tpl.comp === "hourly" ? (tpl as any).hourly : null,
          estimated_hours: tpl.comp === "hourly" ? (tpl as any).estH : null,
        });
      }
    }

    const { data: insertedTasks } = await supabase
      .from("monthly_plan_tasks")
      .insert(taskInserts)
      .select("id, task_date, title");

    // Step 4: Ensure demo volunteers exist
    const volunteerIds: string[] = [];
    for (const v of VOLUNTEER_NAMES) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", v.name)
        .maybeSingle();

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
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", v.email)
          .maybeSingle();
        if (profile) volunteerIds.push(profile.id);
        continue;
      }
      if (authData.user) volunteerIds.push(authData.user.id);
    }

    // Step 5: Create enrollments — mix of contract statuses
    const enrollInserts: any[] = [];
    const contractStatuses = ["signed", "signed", "signed", "signed", "signed", "signed", "signed", "signed", "sent", "sent", "pending", "pending"];

    for (let i = 0; i < volunteerIds.length; i++) {
      enrollInserts.push({
        plan_id: plan.id,
        volunteer_id: volunteerIds[i],
        contract_status: contractStatuses[i % contractStatuses.length],
      });
    }

    const { data: enrollments } = await supabase
      .from("monthly_enrollments")
      .insert(enrollInserts)
      .select("id, volunteer_id, contract_status");

    // Step 6: Create day signups for volunteers with signed contracts
    const signedEnrollments = (enrollments || []).filter((e: any) => e.contract_status === "signed");
    const allTasks = insertedTasks || [];
    const daySignupInserts: any[] = [];

    // Each signed volunteer signs up for ~60% of tasks in the first 2 weeks
    for (const enr of signedEnrollments) {
      // Pick tasks spread across the month
      const shuffled = [...allTasks].sort(() => Math.random() - 0.5);
      const count = Math.floor(shuffled.length * 0.15); // ~15% of all tasks
      const picked = shuffled.slice(0, Math.min(count, 12));

      for (const task of picked) {
        const taskDate = new Date(task.task_date);
        const isPast = taskDate < now;

        daySignupInserts.push({
          enrollment_id: enr.id,
          plan_task_id: task.id,
          volunteer_id: enr.volunteer_id,
          status: "registered",
          // Past tasks: simulate check-in & hour reporting
          checked_in_at: isPast ? new Date(taskDate.getTime() + 8 * 3600000).toISOString() : null,
          checked_out_at: isPast ? new Date(taskDate.getTime() + 16 * 3600000).toISOString() : null,
          volunteer_reported_hours: isPast ? Math.floor(Math.random() * 4) + 4 : null,
          volunteer_approved: isPast,
          club_approved: isPast && Math.random() > 0.3, // 70% confirmed by club
          club_reported_hours: isPast && Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 4 : null,
          hour_status: isPast ? (Math.random() > 0.3 ? "confirmed" : "pending_club") : "none",
          final_hours: isPast && Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 4 : null,
          final_amount: isPast && Math.random() > 0.3 ? Math.floor(Math.random() * 15) + 15 : null,
        });
      }
    }

    // Batch insert in chunks to avoid payload limits
    const CHUNK = 50;
    let totalSignups = 0;
    for (let i = 0; i < daySignupInserts.length; i += CHUNK) {
      const chunk = daySignupInserts.slice(i, i + CHUNK);
      const { error } = await supabase.from("monthly_day_signups").insert(chunk);
      if (!error) totalSignups += chunk.length;
    }

    return new Response(
      JSON.stringify({
        plan_id: plan.id,
        contract_template_id: templateId,
        tasks_created: allTasks.length,
        volunteers: volunteerIds.length,
        enrollments: enrollments?.length || 0,
        day_signups: totalSignups,
        message: `Demo maandplan aangemaakt voor ${planMonth}/${planYear} met ${allTasks.length} taken, ${volunteerIds.length} vrijwilligers, contracten en dagaanmeldingen!`,
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
