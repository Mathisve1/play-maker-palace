

## Audit: Productie-gereedheid voor 1000+ gebruikers

Na een volledige security scan, linter check en codebase analyse zijn er **3 categorieën** issues gevonden: beveiligingslekken (kritiek), data-isolatie (hoog), en code-kwaliteit (medium).

---

### KRITIEK — Moet gefixt voor launch

**K1. Cross-club data-lekkage via RLS policies**
Meerdere tabellen staan toe dat elke ingelogde gebruiker data van ALLE clubs kan lezen:
- `safety_incidents` — incidenten + GPS-coördinaten + foto's van alle clubs zichtbaar
- `content_translations` — elke user kan vertalingen van andere clubs overschrijven
- `briefing_route_waypoints` — elke user kan waypoints van andere clubs wijzigen/verwijderen
- `monthly_plans` / `monthly_plan_tasks` — compensatietarieven van alle clubs zichtbaar

**Fix:** RLS policies herschrijven met `has_club_role()` scoping per tabel.

**K2. Publieke data-exposure zonder authenticatie**
Deze tabellen zijn leesbaar voor niet-ingelogde gebruikers:
- `volunteer_certificates` — PDF-URLs + scores + verificatiecodes
- `quiz_questions` — **correcte antwoorden** zichtbaar → certificaten waardeloos
- `volunteer_skills`, `volunteer_badges`, `task_likes`, `certificate_designs` (handtekening-images)

**Fix:** `USING: true` policies vervangen door `auth.uid() IS NOT NULL`, quiz antwoorden server-side evalueren.

**K3. Storage bucket `contract-templates` te open**
Elke ingelogde gebruiker kan contracttemplates van alle clubs uploaden, lezen én verwijderen.

**Fix:** Path-based policies met club-id scoping.

**K4. Leaked Password Protection uitgeschakeld**
Supabase auth controleert niet op gelekte wachtwoorden.

**Fix:** Via auth configuratie inschakelen.

---

### HOOG — Sterk aanbevolen voor launch

**H1. Edge Functions: geen input validatie**
Geen email-format, string-lengte, IBAN-format, of bedrag-range validatie. Risico op misbruik bij schaal.

**Fix:** Zod schemas toevoegen aan alle edge functions.

**H2. Edge Functions: verbose error messages**
Interne database-fouten, API-keys en systeemarchitectuur worden naar de client gestuurd.

**Fix:** Generieke foutmeldingen naar client, details alleen server-side loggen.

**H3. Contract templates bewerkbaar door medewerkers**
UPDATE policy staat `medewerker` (laagste rol) toe om contracttemplates te wijzigen.

**Fix:** UPDATE beperken tot `bestuurder` + `beheerder`.

**H4. Banking data (IBAN) zichtbaar voor clubeigenaars**
Profiles tabel exposeert bankgegevens via de club-owner SELECT policy.

**Fix:** Aparte `volunteer_banking` tabel of field-level restricties.

---

### MEDIUM — Code-kwaliteit voor stabiliteit

**M1. 1153x `as any` casts in 70 bestanden**
Type-safety ondermijnd op grote schaal — runtime crashes bij onverwachte data.

**Fix:** Incrementeel vervangen, prioriteit op database-queries en insert/update operaties.

---

### Implementatievolgorde

| Prio | Items | Geschatte omvang |
|------|-------|-----------------|
| 1 | K1-K4 (security) | 4 migraties + auth config |
| 2 | H1-H4 (hardening) | Edge function updates + 1 migratie |
| 3 | M1 (type safety) | Incrementeel per bestand |

Totaal: ~12-15 database/edge function wijzigingen om productie-klaar te zijn.

