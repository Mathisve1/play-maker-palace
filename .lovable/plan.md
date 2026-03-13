

# Upgrade Plan voor Clubs — Alle Features

## Fase 1: Onboarding Flow (hoogste impact)

### Wat
Een stapsgewijze onboarding-wizard voor nieuwe vrijwilligers met voortgangsbalk en herinneringen.

### Database
- Nieuwe tabel `volunteer_onboarding_steps` met kolommen: `user_id`, `club_id`, `step` (enum: profile_complete, contract_signed, training_done, first_task), `completed_at`, `skipped`
- Clubs kunnen per club instellen welke stappen verplicht zijn via een `club_onboarding_config` tabel

### Frontend
- Component `OnboardingWizard` dat verschijnt op het vrijwilligersdashboard zolang niet alle stappen voltooid zijn
- Voortgangsbalk bovenaan met stappen: Profiel → Contract → Training → Eerste taak
- Automatische detectie: profiel ingevuld? Contract getekend? Training behaald?
- Push-herinneringen via bestaande `push-reminders` cron voor onvoltooide stappen

---

## Fase 2: Analytics Dashboard

### Wat
Visuele grafieken op het club dashboard met trends en vergelijkingen.

### Aanpak
- Nieuwe pagina `/analytics` met tabs: Vrijwilligers, Events, Retentie
- Grafieken via Recharts (al beschikbaar in het project)
- Data uit bestaande tabellen aggregeren (geen nieuwe tabellen nodig):
  - **Vrijwilligersgroei**: `profiles.created_at` per maand
  - **Opkomst per event**: `task_signups` met status `assigned` vs totaal spots
  - **Retentie**: vrijwilligers actief in maand X die ook actief waren in X-1
  - **Top vrijwilligers**: meeste uren/events
- KPI-kaarten: totaal actief, gemiddelde opkomst%, nieuwe vs terugkerende

---

## Fase 3: Event Templates

### Wat
Templates voor terugkerende events die snel hergebruikt kunnen worden.

### Database
- Nieuwe tabel `event_templates`: `club_id`, `name`, `description`, `template_data` (JSONB met groepen, taken, zones)

### Frontend
- "Opslaan als template" knop bij bestaande events
- "Nieuw event vanuit template" optie in Events Manager
- Template bevat groepen, taken (met tijdslots en spots), en zone-configuratie

---

## Fase 4: Wachtlijst voor Taken

### Database
- Kolom `waitlist_enabled` op `tasks` tabel (boolean, default false)
- Nieuwe tabel `task_waitlist`: `task_id`, `volunteer_id`, `position`, `created_at`

### Logica
- Wanneer een taak vol is en wachtlijst aan staat: vrijwilliger komt op wachtlijst
- Bij annulering: eerste op wachtlijst wordt automatisch toegewezen + push notificatie
- Club kan wachtlijst bekijken en handmatig promoveren

---

## Fase 5: Shift-Ruil Systeem

### Database
- Nieuwe tabel `shift_swaps`: `requester_signup_id`, `target_signup_id`, `status` (pending/approved/rejected), `approved_by`, `created_at`

### Flow
1. Vrijwilliger klikt "Shift ruilen" bij een toegewezen taak
2. Ziet lijst van andere vrijwilligers met dezelfde taak/event
3. Stuurt ruilverzoek → andere vrijwilliger krijgt push
4. Bij akkoord: club krijgt goedkeuringsverzoek in Command Center
5. Bij clubgoedkeuring: signups worden gewisseld

---

## Fase 6: Rating/Review Systeem

### Database
- Nieuwe tabel `volunteer_ratings`: `volunteer_id`, `club_id`, `event_id`, `task_id`, `rating` (1-5), `comment`, `rated_by`, `created_at`
- Gemiddelde score wordt berekend en getoond op vrijwilligersprofiel

### Frontend
- Na event-afsluiting: club kan vrijwilligers beoordelen (sterren + optioneel commentaar)
- Vrijwilligersprofiel toont gemiddelde score en aantal beoordelingen
- "Top vrijwilligers" sectie op club dashboard

---

## Prioriteitsvolgorde

| # | Feature | Impact | Complexiteit |
|---|---------|--------|-------------|
| 1 | Onboarding Flow | Hoog | Medium |
| 2 | Analytics Dashboard | Hoog | Medium |
| 3 | Event Templates | Hoog | Laag |
| 4 | Wachtlijst | Medium | Laag |
| 5 | Shift-Ruil | Medium | Medium |
| 6 | Rating Systeem | Medium | Medium |

## Technische Wijzigingen per Fase

| Fase | Nieuwe tabellen | Nieuwe pagina's | Edge Functions |
|------|----------------|-----------------|----------------|
| 1 | 2 | 0 (widget op dashboard) | push-reminders update |
| 2 | 0 | 1 (/analytics) | Geen |
| 3 | 1 | 0 (in Events Manager) | Geen |
| 4 | 1 + 1 kolom | 0 (in bestaande UI) | Geen |
| 5 | 1 | 0 (in dashboard) | Geen |
| 6 | 1 | 0 (in profiel) | Geen |

Ik raad aan om fase per fase te implementeren, te beginnen met **Onboarding Flow** omdat dit de grootste impact heeft op vrijwilligersbetrokkenheid.

