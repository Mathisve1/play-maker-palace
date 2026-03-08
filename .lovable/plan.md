

## Club Data API — Implementatieplan

### Overzicht
Een REST API waarmee clubs hun eigen data ophalen via API keys. Toegankelijk voor bestuurders en beheerders. Rate limited op 100 calls/uur per key. Output in JSON of CSV. Volledige inline documentatie in een nieuwe "API" tab op de rapportering-pagina.

---

### 1. Database migratie

**Nieuwe tabel `club_api_keys`:**
- `id` uuid PK
- `club_id` uuid FK → clubs NOT NULL
- `api_key` text unique NOT NULL (gen_random_uuid gehashed)
- `key_prefix` text (eerste 8 chars voor UI display)
- `name` text (label, bv "Power BI")
- `is_active` boolean default true
- `last_used_at` timestamptz nullable
- `calls_this_hour` int default 0
- `hour_window_start` timestamptz nullable
- `created_by` uuid FK → profiles
- `created_at` timestamptz default now()

**RLS:** Bestuurder + beheerder van de club mogen CRUD via `has_club_role(auth.uid(), club_id, '{bestuurder,beheerder}')`.

### 2. Edge Function: `club-data-api`

`verify_jwt = false` — authenticatie via Bearer API key.

**Logica:**
1. Extract `Authorization: Bearer <key>` → lookup in `club_api_keys` where `is_active = true`
2. Rate limit check: als `calls_this_hour >= 100` en `hour_window_start` binnen huidig uur → 429
3. Update `last_used_at`, increment `calls_this_hour` (reset als nieuw uur)
4. Query parameter `resource`: `volunteers`, `tasks`, `events`, `signups`, `payments`, `sepa_batches`, `compliance_declarations`, `season_contracts`, `tickets`, `partners`
5. Alle queries gefilterd op `club_id` van de key
6. `format=csv` → CSV output, anders JSON
7. `from`/`to` datumfilter, `limit`/`offset` paginatie (max 1000)

**Resources mapping:**
| Resource | Tabel(len) | Join/filter |
|----------|-----------|-------------|
| `volunteers` | profiles via task_signups → tasks | tasks.club_id |
| `tasks` | tasks | club_id |
| `events` | events | club_id |
| `signups` | task_signups → tasks | tasks.club_id |
| `payments` | volunteer_payments | club_id |
| `sepa_batches` | sepa_batches + sepa_batch_items | club_id |
| `compliance` | compliance_declarations → profiles | club_id (via task_signups) |
| `contracts` | season_contracts | club_id |
| `tickets` | tickets | club_id |
| `partners` | external_partners | club_id |

### 3. Frontend: ReportingApiTab component

**Nieuw bestand:** `src/components/reporting/ReportingApiTab.tsx`

Drie secties:
1. **Key Management** — Tabel met bestaande keys (prefix, naam, status, last used, calls). Knoppen: genereer nieuwe key (met naam-input), herroep key. Bij genereren: toon volledige key éénmalig in een dialog.
2. **Documentatie** — Inline docs met base URL, auth header, alle resources met velden-beschrijving, query parameters, en voorbeeldcode in cURL, JavaScript (fetch), en Python (requests).
3. **Live Tester** — Dropdown voor resource, optionele datum-range, "Test" knop → response preview in een code block.

### 4. Integratie in ReportingDashboard

Nieuwe tab "API" toevoegen naast de bestaande tabs (overview, volunteers, ..., ai). Alleen zichtbaar voor bestuurder/beheerder rollen.

---

### Bestanden

| Actie | Bestand |
|-------|---------|
| Nieuw | `supabase/migrations/xxx_club_api_keys.sql` |
| Nieuw | `supabase/functions/club-data-api/index.ts` |
| Nieuw | `src/components/reporting/ReportingApiTab.tsx` |
| Edit | `src/pages/ReportingDashboard.tsx` — tab toevoegen |
| Edit | `supabase/config.toml` — verify_jwt = false |

