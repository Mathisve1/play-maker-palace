
# Safety & Security: Hulpdienst-bollen, Responsive Fullscreen & Configuratie

## Samenvatting van wijzigingen

### 1. "Prioriteit" vervangen door "Hulpdiensten / Response Teams"

**Concept:** Elke incident-type kan meerdere hulpdienst-teams gekoppeld krijgen. Clubs stellen zelf de team-namen en kleuren in (bv. "Politie" = blauw, "Rode Kruis" = rood, "Brandweer" = oranje). Bij een incident worden de gekoppelde hulpdienst-bollen getoond i.p.v. een priority-badge.

**Database-wijzigingen:**
- Nieuwe tabel `safety_response_teams`: `id, club_id, name, color, sort_order, created_at`
- Nieuwe koppeltabel `safety_incident_type_teams`: `id, incident_type_id, response_team_id`
- Kolom `default_priority` op `safety_incident_types` wordt genegeerd/verwijderd
- Kolom `priority` op `safety_incidents` wordt genegeerd/verwijderd
- RLS: zelfde patroon als bestaande safety-tabellen

**UI-wijzigingen:**
- SafetyConfigDialog: prioriteit-dropdown vervangen door multi-select van hulpdienst-teams
- SafetyConfigDialog: nieuw tab/sectie "Response Teams" waar clubs teams + kleuren beheren
- SafetyDashboard: priority-badge vervangen door gekleurde bollen per hulpdienst
- SafetyDashboard: elke incident toont de gekoppelde response team bollen

### 2. Geluid bij ALLE incidenten

- `playAlarm()` wordt getriggerd bij elk nieuw incident (niet alleen `priority === 'high'`)
- Rode flash-animatie ook bij elk incident

### 3. Responsive fullscreen layouts

**Sectie Monitor (fullscreen):**
- Zone-kaarten vullen het hele scherm met CSS Grid `auto-fill` + `minmax()`
- Kaarten schalen mee met schermgrootte, geen vaste breedte

**Live Incidents (fullscreen):**
- Hoofd-layout: grote kaart bovenaan (50-60vh) + scrollbare incident-lijst eronder
- Mini-maps per incident verwijderen, vervangen door klikbare markers op de hoofdkaart
- Incident-kaartjes krijgen meer ruimte en betere leesbaarheid

### 4. Safety Configuratie als subpagina onder Planning

- Nieuw menu-item "Safety Configuratie" in `ClubOwnerSidebar` direct onder "Planning"
- Route: `/safety-config` → nieuwe pagina `SafetyConfigPage.tsx`
- Pagina toont evenementenlijst, per event kan je de safety config openen (zones, incident types + response teams, checklist)
- Safety-knop verwijderen uit Events Manager

### 5. Demo aanpassen

- `safety-demo` edge function: priority vervangen door response team koppelingen
- Demo maakt standaard response teams aan (Politie/blauw, Rode Kruis/rood, Brandweer/oranje, Security/geel)
- Elk demo incident-type krijgt relevante teams gekoppeld
- Incidents worden aangemaakt zonder `priority` veld

## Volgorde van implementatie

1. Database migratie (nieuwe tabellen + policies)
2. SafetyConfigDialog updaten (response teams tab, priority weg)
3. SafetyDashboard updaten (hulpdienst-bollen, geluid, responsive fullscreen)
4. Safety config subpagina + sidebar
5. Demo edge function updaten
6. Events Manager: safety-knop verwijderen

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| Database migratie | `safety_response_teams` + `safety_incident_type_teams` tabellen |
| `src/components/SafetyConfigDialog.tsx` | Response teams tab, priority weg, team-koppeling per incident type |
| `src/pages/SafetyDashboard.tsx` | Hulpdienst-bollen, geluid bij alles, responsive fullscreen |
| `src/components/safety/IncidentMap.tsx` | Grotere kaart, betere markers |
| `src/components/ClubOwnerSidebar.tsx` | Nieuw menu-item "Safety Configuratie" |
| `src/pages/SafetyConfigPage.tsx` | Nieuwe pagina |
| `src/App.tsx` | Route toevoegen |
| `supabase/functions/safety-demo/index.ts` | Response teams, priority weg |
| `src/pages/EventsManager.tsx` | Safety-knop verwijderen |
| `src/components/safety/VolunteerPhoneMockup.tsx` | Priority weg, bollen tonen |
