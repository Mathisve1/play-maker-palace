// Eenmalige demo-seed voor "Universiteit Gent" (UGent) account.
// Trigger via: supabase.functions.invoke('seed-ugent-demo') of curl.
// Idempotent: als de owner al bestaat, wordt eerst alle UGent-data opgeruimd.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OWNER_EMAIL = 'ugent@de12eman.be';
const OWNER_PASSWORD = 'Ugent123?';
const CLUB_NAME = 'Universiteit Gent';

const FIRST_NAMES = ['Lotte','Wout','Senne','Marie','Emma','Lukas','Noah','Lara','Sien','Femke','Jonas','Robbe','Ella','Tibo','Zoë','Stan','Nora','Liam','Mila','Finn','Anna','Vince','Lisa','Arne','Lien','Bram','Imke','Yana','Maxim','Eline','Jasper','Sara','Daan','Lize','Mathis','Elise','Tom','Hanne','Kobe','Iris','Pieter','Charlotte','Wannes','Julie','Simon','Marit','Aaron','Lore','Quinten','Janne','Ferre','Amber','Jules','Esmee','Ruben','Lana','Cas','Helena','Gilles','Fien','Niels','Hannelore','Lennert','Anouk','Brent','Mira','Mathias','Saar','Tuur','Roos','Karel','Eva','Joppe','Mieke','Owen','Linde','Kasper','Tine','Vic','Lieselot','Jens','Sofie','Jarne','Britt','Toon','Greet','Senna','Marlies','Boaz','Anke','Thibo','Kato','Lewis','Maaike','Nand','Loes','Mees','Renée','Otis','Annelies'];
const LAST_NAMES = ['Janssens','Peeters','Maes','Jacobs','Mertens','Willems','Claes','Goossens','Wouters','De Smet','Dubois','Lambert','Dupont','Martens','Vermeulen','Van Damme','De Vos','Hermans','Lemmens','Cools','Engelen','Stevens','Verhoeven','Pauwels','Thys','Aerts','Smets','Coppens','Vandenberghe','Desmet','Bogaerts','Verstraete','Dewulf','De Backer','Roels','Vermeersch','Verhaeghe','De Coninck','Van de Velde','Lambrecht','Verbeke','De Clercq','Christiaens','Vandevelde','De Meyer','Verhulst','Naessens','Degroote','Vandenbroucke','Strobbe'];

const NL_TZ = 'Europe/Brussels';

function rand(arr: any[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const c = [...arr]; const out: T[] = [];
  for (let i = 0; i < n && c.length > 0; i++) out.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);
  return out;
}
function genIBAN(): string {
  let n = 'BE';
  for (let i = 0; i < 14; i++) n += Math.floor(Math.random()*10);
  return n;
}
function genPhone(): string {
  return '+324' + (60+Math.floor(Math.random()*40)) + Math.floor(Math.random()*900000+100000);
}
function dateAt(d: Date, hour: number, min = 0): string {
  const x = new Date(d); x.setHours(hour, min, 0, 0); return x.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const log: string[] = [];
  const L = (s: string) => { console.log(s); log.push(s); };

  try {
    // ─── 1. CLEAN UP IF EXISTS ─────────────────────────────────────────
    L('Cleanup: checking for existing UGent owner...');
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existingOwner = existing?.users.find(u => u.email === OWNER_EMAIL);

    if (existingOwner) {
      L(`Found existing owner ${existingOwner.id}, removing related clubs+data...`);
      const { data: oldClubs } = await supabase.from('clubs').select('id').eq('owner_id', existingOwner.id);
      for (const c of oldClubs ?? []) {
        await supabase.from('clubs').delete().eq('id', c.id); // cascades
      }
      // delete demo volunteer auth users (by email pattern)
      const demoUsers = existing.users.filter(u => u.email?.match(/^demo-vrijwilliger-\d+@ugent\.be$/));
      for (const u of demoUsers) await supabase.auth.admin.deleteUser(u.id);
      await supabase.auth.admin.deleteUser(existingOwner.id);
      L(`Removed ${(oldClubs?.length ?? 0)} clubs and ${demoUsers.length + 1} auth users.`);
    }

    // ─── 2. CREATE OWNER ───────────────────────────────────────────────
    L('Creating owner auth user...');
    const { data: ownerCreated, error: ownerErr } = await supabase.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'UGent Sportdienst' },
    });
    if (ownerErr) throw new Error(`Owner create: ${ownerErr.message}`);
    const ownerId = ownerCreated.user!.id;
    await supabase.from('profiles').update({
      full_name: 'UGent Sportdienst',
      city: 'Gent',
      phone: '+3292649911',
      language: 'nl',
    }).eq('id', ownerId);

    // ─── 3. CLUB ───────────────────────────────────────────────────────
    L('Creating club...');
    const { data: club, error: clubErr } = await supabase.from('clubs').insert({
      name: CLUB_NAME,
      owner_id: ownerId,
      sport: 'Multisport / Universiteit',
      location: 'Sint-Pietersnieuwstraat 25, 9000 Gent',
      description: 'De Universiteit Gent organiseert academische én sportevenementen voor 50.000+ studenten en personeel. Onze vrijwilligers maken het verschil.',
      why_volunteer: 'Doe relevante ervaring op, krijg gratis tickets voor evenementen, bouw je netwerk uit en geniet van exclusieve UGent-merch.',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/UGent-logo.svg/512px-UGent-logo.svg.png',
      referral_bonus_points: 50,
    }).select().single();
    if (clubErr) throw new Error(`Club: ${clubErr.message}`);
    const clubId = club.id;
    L(`Club created: ${clubId}`);

    // billing config
    await supabase.from('club_billing').insert({
      club_id: clubId, billing_email: OWNER_EMAIL,
      volunteer_price_cents: 1500, current_season_volunteers_billed: 0,
    });

    // ─── 4. SEASON ─────────────────────────────────────────────────────
    L('Creating season...');
    const { data: season, error: seasErr } = await supabase.from('seasons').insert({
      club_id: clubId, name: 'Academiejaar 2025-2026', is_active: true,
      start_date: '2025-08-15', end_date: '2026-06-30',
    }).select().single();
    if (seasErr) throw new Error(`Season: ${seasErr.message}`);
    const seasonId = season.id;

    // ─── 5. SAFETY ZONES ───────────────────────────────────────────────
    L('Creating safety zones...');
    const zoneDefs = [
      { name: 'Hoofdingang Sint-Pietersnieuwstraat', color: '#1E64C8', desc: 'Hoofdtoegangspoort campus' },
      { name: 'GUSB Sportzaal A', color: '#FFD200', desc: 'Topsportzaal Watersportbaan' },
      { name: 'Aula UFO', color: '#10b981', desc: 'Centrale aula 800 plaatsen' },
      { name: 'Restaurant De Brug', color: '#f97316', desc: 'Studentenresto' },
      { name: 'Parking Sterre', color: '#ef4444', desc: 'Bezoekersparking campus Sterre' },
      { name: 'EHBO-post centraal', color: '#dc2626', desc: 'Centrale eerstehulppost' },
    ];
    const { data: zones } = await supabase.from('club_safety_zones').insert(
      zoneDefs.map((z,i) => ({ club_id: clubId, name: z.name, color: z.color, location_description: z.desc, sort_order: i }))
    ).select();
    L(`Zones: ${zones?.length}`);

    // ─── 6. ACADEMY TRAININGS ──────────────────────────────────────────
    L('Creating trainings...');
    const trainingDefs = [
      { title: 'Veiligheidsbasis UGent', desc: 'Algemene veiligheid op de UGent-campus: evacuatie, brandveiligheid, EHBO-basics.' },
      { title: 'EHBO voor evenementen', desc: 'Eerste hulp bij studentenevenementen en sportwedstrijden.' },
      { title: 'Catering & hygiëne', desc: 'HACCP-richtlijnen voor cantussen, recepties en sportcatering.' },
      { title: 'Steward-opleiding', desc: 'Crowd control, conflictbeheersing, communicatie tijdens grote events.' },
      { title: 'AED & reanimatie', desc: 'Bediening AED-toestellen op campus.' },
    ];
    const { data: trainings } = await supabase.from('academy_trainings').insert(
      trainingDefs.map(t => ({ club_id: clubId, title: t.title, description: t.desc, is_published: true }))
    ).select();
    L(`Trainings: ${trainings?.length}`);

    // ─── 7. CONTRACT TEMPLATE (placeholder, geen echte DocuSeal) ───────
    L('Creating contract templates...');
    const { data: ctTpls } = await supabase.from('contract_templates').insert([
      { club_id: clubId, name: 'Steward seizoenscontract 2025-26', docuseal_template_id: 999001, created_by: ownerId },
      { club_id: clubId, name: 'Catering seizoenscontract 2025-26', docuseal_template_id: 999002, created_by: ownerId },
      { club_id: clubId, name: 'Algemeen vrijwilligerscontract', docuseal_template_id: 999003, created_by: ownerId },
    ]).select();
    L(`Contract templates: ${ctTpls?.length}`);

    // ─── 8. VOLUNTEERS ─────────────────────────────────────────────────
    L('Creating 100 volunteer profiles + 10 demo logins...');
    const volunteerIds: string[] = [];
    const demoLoginIds: string[] = [];

    // 10 demo logins eerst
    for (let i = 1; i <= 10; i++) {
      const fn = rand(FIRST_NAMES); const ln = rand(LAST_NAMES);
      const { data: u, error: ue } = await supabase.auth.admin.createUser({
        email: `demo-vrijwilliger-${i}@ugent.be`,
        password: 'Ugent123?',
        email_confirm: true,
        user_metadata: { full_name: `${fn} ${ln}` },
      });
      if (ue) { L(`!! demo user ${i}: ${ue.message}`); continue; }
      const uid = u.user!.id;
      demoLoginIds.push(uid); volunteerIds.push(uid);
      await supabase.from('profiles').update({
        full_name: `${fn} ${ln}`, city: 'Gent', phone: genPhone(),
        bank_iban: genIBAN(), bank_holder_name: `${fn} ${ln}`,
        bank_consent_given: true, bank_consent_date: new Date().toISOString(),
        date_of_birth: `${1970 + Math.floor(Math.random()*35)}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}-${String(1+Math.floor(Math.random()*28)).padStart(2,'0')}`,
        language: 'nl', primary_club_id: clubId,
      }).eq('id', uid);
    }

    // 90 profielen-only (via auth admin met random emails om profiel-trigger te laten lopen)
    for (let i = 0; i < 90; i++) {
      const fn = rand(FIRST_NAMES); const ln = rand(LAST_NAMES);
      const email = `vrijwilliger-${Date.now()}-${i}@ugent-demo.be`;
      const { data: u, error: ue } = await supabase.auth.admin.createUser({
        email, password: crypto.randomUUID(), email_confirm: true,
        user_metadata: { full_name: `${fn} ${ln}` },
      });
      if (ue) { continue; }
      const uid = u.user!.id;
      volunteerIds.push(uid);
      await supabase.from('profiles').update({
        full_name: `${fn} ${ln}`, city: rand(['Gent','Sint-Amandsberg','Mariakerke','Gentbrugge','Ledeberg','Wondelgem','Drongen']),
        phone: genPhone(), bank_iban: genIBAN(), bank_holder_name: `${fn} ${ln}`,
        bank_consent_given: Math.random() > 0.3, bank_consent_date: new Date().toISOString(),
        date_of_birth: `${1965 + Math.floor(Math.random()*40)}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}-${String(1+Math.floor(Math.random()*28)).padStart(2,'0')}`,
        language: 'nl', primary_club_id: clubId,
      }).eq('id', uid);
    }
    L(`Volunteers created: ${volunteerIds.length} (${demoLoginIds.length} demo logins)`);

    // memberships
    L('Creating club memberships...');
    const memberships = volunteerIds.map(vid => ({
      club_id: clubId, volunteer_id: vid, status: 'actief', club_role: 'vrijwilliger',
    }));
    // batch insert in chunks of 50
    for (let i = 0; i < memberships.length; i += 50) {
      await supabase.from('club_memberships').insert(memberships.slice(i, i+50));
    }

    // ─── 9. EVENTS ─────────────────────────────────────────────────────
    L('Creating events (past + future)...');
    const eventDefs = [
      // VERLEDEN
      { title: 'Opening Academiejaar 2025-26', date: '2025-09-22', kickoff: '14:00', type: 'academic', past: true },
      { title: 'Studentenwelkom Sint-Pietersplein', date: '2025-09-25', kickoff: '18:00', type: 'student', past: true },
      { title: 'Sportdag GUSB September', date: '2025-09-28', kickoff: '10:00', type: 'sport', past: true },
      { title: 'Infodag Faculteit Geneeskunde', date: '2025-10-11', kickoff: '09:00', type: 'academic', past: true },
      { title: 'Cantus Faculteitenkring', date: '2025-10-18', kickoff: '20:00', type: 'student', past: true },
      { title: 'KAA Gent x UGent — Vrijwilligersdag', date: '2025-10-25', kickoff: '15:00', type: 'sport', past: true },
      { title: 'Quiz Night UGent Alumni', date: '2025-11-08', kickoff: '19:30', type: 'student', past: true },
      { title: 'Ladies Run Watersportbaan', date: '2025-11-15', kickoff: '11:00', type: 'sport', past: true },
      { title: 'Sinterklaas op de campus', date: '2025-12-06', kickoff: '13:00', type: 'student', past: true },
      { title: '12-urenloop Blandijn', date: '2026-02-14', kickoff: '12:00', type: 'sport', past: true },
      { title: 'Cantus Geneeskunde', date: '2026-02-21', kickoff: '20:00', type: 'student', past: true },
      { title: 'Studentensportgala', date: '2026-03-07', kickoff: '19:00', type: 'sport', past: true },
      { title: 'Infodag Bachelor Opleidingen', date: '2026-03-14', kickoff: '10:00', type: 'academic', past: true },
      { title: 'Basketbalwedstrijd UGent vs KU Leuven', date: '2026-03-21', kickoff: '20:00', type: 'sport', past: true },
      // TOEKOMST
      { title: 'Examenontbijt Mei', date: '2026-05-04', kickoff: '07:30', type: 'student', past: false },
      { title: 'Galabal Faculteit Economie', date: '2026-05-09', kickoff: '20:00', type: 'student', past: false },
      { title: 'Sportkampioenschap Studenten', date: '2026-05-16', kickoff: '10:00', type: 'sport', past: false },
      { title: 'Dies Natalis UGent', date: '2026-05-23', kickoff: '15:00', type: 'academic', past: false },
      { title: 'Voetbalwedstrijd Universitaire Liga', date: '2026-05-30', kickoff: '14:00', type: 'sport', past: false },
      { title: 'Proclamatie Faculteit Rechten', date: '2026-06-13', kickoff: '14:00', type: 'academic', past: false },
      { title: 'Zomerfestival UGent Studentenkring', date: '2026-06-20', kickoff: '17:00', type: 'student', past: false },
    ];

    const eventRows: any[] = [];
    for (const e of eventDefs) {
      const dt = `${e.date}T${e.kickoff}:00+02:00`;
      eventRows.push({
        club_id: clubId, title: e.title, event_date: dt, kickoff_time: e.kickoff + ':00',
        event_type: 'event', status: e.past ? 'completed' : 'open',
        location: rand(['Sint-Pietersnieuwstraat 25, Gent','GUSB Watersportbaan, Gent','Aula UFO, Sint-Pietersplein 7, Gent','Campus Sterre, Krijgslaan 281, Gent']),
        description: `${e.title} — georganiseerd door UGent. Vrijwilligers gezocht voor stewards, catering, onthaal en logistiek.`,
      });
    }
    const { data: events, error: evErr } = await supabase.from('events').insert(eventRows).select();
    if (evErr) throw new Error(`Events: ${evErr.message}`);
    L(`Events: ${events!.length}`);

    // ─── 10. EVENT GROUPS + TASKS + SIGNUPS ────────────────────────────
    L('Creating event groups, tasks and signups...');
    const groupTemplates = [
      { name: 'Stewards', color: '#1E64C8', spots: 8 },
      { name: 'Catering', color: '#FFD200', spots: 6 },
      { name: 'Onthaal & ticketing', color: '#10b981', spots: 4 },
      { name: 'Logistiek & opbouw', color: '#f97316', spots: 5 },
      { name: 'EHBO', color: '#dc2626', spots: 2 },
    ];

    let totalTasks = 0; let totalSignups = 0; let totalCompleted = 0;
    const allCheckedInSignupIds: string[] = [];

    for (const ev of events!) {
      const evDef = eventDefs.find(d => d.title === ev.title)!;
      const evDate = new Date(ev.event_date);

      // event groups
      const groupRows = groupTemplates.map((g, i) => ({
        event_id: ev.id, name: g.name, color: g.color, sort_order: i,
        briefing_time: i === 0 ? '08:00' : null,
        briefing_location: i === 0 ? 'Vergaderzaal GUSB' : null,
      }));
      const { data: grps } = await supabase.from('event_groups').insert(groupRows).select();

      // 3-5 tasks per event
      const taskCount = 3 + Math.floor(Math.random() * 3);
      for (let t = 0; t < taskCount; t++) {
        const grp = grps![t % grps!.length];
        const tpl = groupTemplates.find(g => g.name === grp.name)!;
        const startHour = parseInt(evDef.kickoff.split(':')[0]) - 2 + t;
        const startTime = dateAt(evDate, Math.max(7, startHour), 0);
        const endTime = dateAt(evDate, Math.max(8, startHour + 4), 0);
        const spots = tpl.spots;

        const { data: task } = await supabase.from('tasks').insert({
          club_id: clubId, event_id: ev.id, event_group_id: grp.id,
          title: `${grp.name} — ${ev.title}`,
          description: `Vrijwilligerstaak voor ${ev.title}. Aanmelden in vergaderzaal GUSB om 08u.`,
          task_date: ev.event_date, start_time: startTime, end_time: endTime,
          location: ev.location, spots_available: spots,
          status: evDef.past ? 'completed' : 'open',
          compensation_type: 'fixed', expense_reimbursement: true, expense_amount: 25.0,
          loyalty_points: 20, loyalty_eligible: true,
          briefing_time: dateAt(evDate, Math.max(7, startHour - 1), 30),
          briefing_location: 'Vergaderzaal GUSB',
        }).select().single();
        if (!task) continue;
        totalTasks++;

        // signups
        let fillRatio: number;
        if (evDef.past) fillRatio = 0.85 + Math.random() * 0.15; // 85-100% bezet
        else {
          const daysUntil = (evDate.getTime() - Date.now()) / (1000*60*60*24);
          if (daysUntil < 14) fillRatio = 0.3 + Math.random() * 0.5; // 30-80%
          else fillRatio = Math.random() * 0.6; // 0-60%
        }
        const wantSignups = Math.min(spots, Math.round(spots * fillRatio));
        const chosen = pickN(volunteerIds, wantSignups);

        const signupRows = chosen.map(vid => ({
          task_id: task.id, volunteer_id: vid,
          status: 'assigned',
          attendance_status: evDef.past ? 'checked_in' : 'scheduled',
          checked_in_at: evDef.past ? startTime : null,
          signed_up_at: new Date(evDate.getTime() - Math.random() * 14 * 86400000).toISOString(),
        }));
        if (signupRows.length > 0) {
          const { data: sus } = await supabase.from('task_signups').insert(signupRows).select('id');
          totalSignups += signupRows.length;
          if (evDef.past) {
            totalCompleted += signupRows.length;
            sus?.forEach(s => allCheckedInSignupIds.push(s.id));
          }
        }
      }
    }
    L(`Tasks: ${totalTasks}, Signups: ${totalSignups}, Completed checkins: ${totalCompleted}`);

    // ─── 11. SAFETY TEAMS (op 1 toekomstig event) ──────────────────────
    L('Creating safety teams...');
    const futureEvents = events!.filter(e => new Date(e.event_date) > new Date());
    if (futureEvents.length > 0 && demoLoginIds.length >= 3) {
      const tgtEvent = futureEvents[0];
      await supabase.from('safety_teams').insert([
        { event_id: tgtEvent.id, club_id: clubId, name: 'Hoofdstewards', leader_id: demoLoginIds[0] },
        { event_id: tgtEvent.id, club_id: clubId, name: 'EHBO-team', leader_id: demoLoginIds[1] },
        { event_id: tgtEvent.id, club_id: clubId, name: 'Crisisteam', leader_id: demoLoginIds[2] },
      ]);
    }

    // ─── 12. SAFETY INCIDENTS (verleden) ───────────────────────────────
    L('Creating safety incidents...');
    const pastEvents = events!.filter(e => new Date(e.event_date) < new Date());
    if (pastEvents.length > 0) {
      const incidents = [
        { desc: 'Lichte valpartij bij hoofdingang. Vrijwilliger EHBO ter plaatse, gast verzorgd en doorverwezen.', priority: 'low', status: 'opgelost' },
        { desc: 'Gast onwel tijdens evenement, EHBO-team ingeschakeld, gast hersteld na 20 min.', priority: 'medium', status: 'opgelost' },
        { desc: 'Verloren voorwerp (sleutels) ingeleverd bij onthaal en opgehaald door eigenaar.', priority: 'low', status: 'opgelost' },
        { desc: 'Vals brandalarm (rookmelder defect) — geverifieerd door safety team, geen evacuatie nodig.', priority: 'medium', status: 'opgelost' },
      ];
      const { error: incErr } = await supabase.from('safety_incidents').insert(
        incidents.map((inc, i) => ({
          club_id: clubId, event_id: pastEvents[i % pastEvents.length].id,
          priority: inc.priority, status: inc.status,
          description: inc.desc, reporter_id: ownerId,
          resolved_by: ownerId, resolved_at: new Date().toISOString(),
        }))
      );
      if (incErr) L(`!! incidents: ${incErr.message}`);
    }

    // ─── 13. SPONSORS + CAMPAIGNS ──────────────────────────────────────
    L('Creating sponsors...');
    const { data: sponsors } = await supabase.from('sponsors').insert([
      { club_id: clubId, name: 'Quick Gent', brand_color: '#E60012', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Quick_Restaurants_logo.svg', contact_name: 'Tim Quick', contact_email: 'tim@quick-gent.be' },
      { club_id: clubId, name: 'Brouwerij Roman', brand_color: '#8B4513', contact_name: 'Lieve Roman', contact_email: 'lieve@roman.be' },
      { club_id: clubId, name: 'Decathlon Gent', brand_color: '#0082C3', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Decathlon_Logo.png', contact_name: 'Karel Decat', contact_email: 'karel@decathlon.be' },
    ]).select();

    if (sponsors) {
      const campRows = sponsors.map((sp,i) => ({
        club_id: clubId, sponsor_id: sp.id, campaign_type: 'dashboard_banner',
        title: ['Gratis frietjes na je shift!','€2 korting op een Romy Pils','-15% op sportkleding voor UGent vrijwilligers'][i],
        description: 'Exclusieve aanbieding voor UGent vrijwilligers.',
        reward_text: ['1× gratis kleine frituur','€2 korting','-15% kortingscode'][i],
        reward_value_cents: [350, 200, 0][i],
        status: 'active',
        start_date: '2025-09-01', end_date: '2026-06-30',
        custom_cta: ['Toon op kassa','Toon op tap','Toon in winkel'][i],
      }));
      await supabase.from('sponsor_campaigns').insert(campRows);
    }

    // ─── 14. NOTIFICATIONS voor demo logins ────────────────────────────
    L('Creating notifications for demo logins...');
    const notifRows: any[] = [];
    for (const uid of demoLoginIds) {
      notifRows.push(
        { user_id: uid, title: 'Welkom bij UGent', message: 'Je bent ingeschreven als vrijwilliger bij UGent. Bekijk de openstaande taken!', type: 'system' },
        { user_id: uid, title: 'Contract klaar', message: 'Je seizoenscontract staat klaar voor ondertekening.', type: 'contract' },
        { user_id: uid, title: 'Bedankt voor je hulp!', message: 'Je voltooide taak op de Sportdag. Je krijgt 20 loyaliteitspunten.', type: 'thankyou' },
      );
    }
    await supabase.from('notifications').insert(notifRows);

    // ─── 15. DONE ──────────────────────────────────────────────────────
    L('=== SEED COMPLETE ===');
    return new Response(JSON.stringify({
      success: true,
      owner: { email: OWNER_EMAIL, password: OWNER_PASSWORD, id: ownerId },
      club: { id: clubId, name: CLUB_NAME },
      season_id: seasonId,
      counts: {
        volunteers: volunteerIds.length,
        demo_logins: demoLoginIds.length,
        events: events!.length,
        tasks: totalTasks,
        signups: totalSignups,
        completed_checkins: totalCompleted,
      },
      demo_volunteer_logins: demoLoginIds.map((_, i) => `demo-vrijwilliger-${i+1}@ugent.be / Ugent123?`),
      log,
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('SEED FAILED', e);
    return new Response(JSON.stringify({ success: false, error: e.message, log }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
