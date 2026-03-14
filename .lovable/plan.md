

# Audit: Kritische issues voor een echte wedstrijd

## Gevonden problemen

### 1. KRITISCH: Test-alarm draait bij ELKE paginaload (SafetyDashboard.tsx:148-160)
Er zit nog een **test-useEffect** in de Safety Control Room die bij elke paginaload 5x het brandalarm laat afgaan (op 3, 6, 9, 12 en 15 seconden). Dit moet verwijderd worden -- het staat letterlijk gemarkeerd als `// ONE-TIME test: fire alarm 5x — REMOVE AFTER TESTING`.

### 2. KRITISCH: `safety_checklist_progress` wordt ZONDER filter opgehaald
In zowel `SafetyDashboard.tsx` (lijn 229) als `SafetyEventHub.tsx` (lijn 48) wordt `supabase.from('safety_checklist_progress').select('*')` gedaan **zonder enige filter**. Dit haalt ALLE progress records op van ALLE events en ALLE gebruikers. Bij een echte wedstrijd met 700 vrijwilligers groeit dit exponentieel en veroorzaakt het performance-problemen en potentieel verkeerde data.

### 3. Checklist-items niet gefilterd op toewijzing (VolunteerSafetyTab)
De `VolunteerSafetyTab` filtert checklist-items op zone/groep, maar negeert de nieuwe `assigned_volunteer_id` en `assigned_team_id` kolommen die in de migratie zijn toegevoegd. Vrijwilligers zien dus ALLE items van hun zone in plaats van alleen de items die aan hen zijn toegewezen (zoals afgesproken: "alleen eigen taken").

### 4. Safety checklist-items missen toewijzing-UI in Control Room
De `SafetyConfigDialog` en het Safety Dashboard bieden geen UI om `assigned_volunteer_id` of `assigned_team_id` in te stellen op `safety_checklist_items`. Clubs kunnen dus geen checklist-items per persoon/team toewijzen, ondanks dat de database-kolommen bestaan.

### 5. Briefing checklist-items: geen filtering of toewijzing-UI
Zelfde probleem als punt 3 en 4 maar dan voor `briefing_checklist_items` -- kolommen bestaan in de DB maar worden nergens in de frontend gebruikt.

### 6. Closing tasks: geen filter op niet-toegewezen taken
`VolunteerClosingView` filtert op `assigned_volunteer_id = userId` OF `assigned_team_id IN userTeams`. Maar taken **zonder toewijzing** (both null) worden niet getoond aan niemand. Dit kan problematisch zijn als een club vergeet taken toe te wijzen.

### 7. `safety_location_options` zonder filter
`SafetyDashboard.tsx` lijn 231: `supabase.from('safety_location_options').select('*')` haalt ALLE locatie-opties op zonder club-filter. Cross-club data-lekkage bij meerdere clubs.

## Plan van aanpak

### Stap 1: Test-alarm verwijderen
- Verwijder het `useEffect` blok op lijn 148-160 in `SafetyDashboard.tsx`

### Stap 2: Checklist progress query scopen
- `SafetyDashboard.tsx`: filter op `event_id` via een join of subquery op `checklist_item_id`
- `SafetyEventHub.tsx`: zelfde fix
- Alternatief: filter client-side op de item-IDs die al geladen zijn (snellere fix)

### Stap 3: Checklist-items filteren op toewijzing in VolunteerSafetyTab
- Na het laden van items, extra filter: als een item `assigned_volunteer_id` of `assigned_team_id` heeft, toon het alleen als het matcht met de huidige gebruiker/teams
- Items zonder toewijzing blijven zichtbaar voor iedereen in die zone (backward compatible)

### Stap 4: Location options filteren op club
- Voeg `.eq('level_id', ...)` filter toe of filter client-side op basis van de al geladen `levelIds`

### Stap 5: Niet-toegewezen closing tasks fallback
- Toon niet-toegewezen taken (both null) aan alle vrijwilligers van dat event, of toon een waarschuwing aan de club-admin

### Technische details
- Alle wijzigingen zijn frontend-only (geen migraties nodig)
- Bestanden: `SafetyDashboard.tsx`, `SafetyEventHub.tsx`, `VolunteerSafetyTab.tsx`, `VolunteerClosingView.tsx`
- De toewijzing-UI voor checklist-items (punt 4 en 5) is een grotere feature die apart kan worden opgepakt

