

# Vrijwilliger Feature Uitbreiding — Implementatieplan

## Geselecteerde features (7 stuks)

1. **Digitaal certificaat PDF** — Auto-genereerd attest na taak/training
2. **Kalender-sync (.ics / feed)** — Shifts exporteren naar externe kalenders
3. **Achievements & badges** — Gamification met mijlpaal-badges
4. **Groepschat per event** — Vrijwilligers chatten onderling per event
5. **Taak-notities & foto's** — Notities/foto's toevoegen tijdens shift
6. **Wachtlijst-notificaties** — Push bij vrijgekomen plek
7. **Social media sharing** — Badges/activiteiten delen

---

## Voorgestelde volgorde

### Fase A: Wachtlijst-notificaties
Kleinste wijziging — geen nieuwe tabellen nodig. Wanneer een `task_signup` wordt geannuleerd en er staat iemand op de `task_waitlist`, automatisch push sturen + optioneel auto-promoten.

- Trigger in bestaande annuleer-logica (`TaskDetail.tsx`, `CommandCenter.tsx`)
- `sendPush()` naar eerste wachtlijst-persoon
- Optioneel: auto-assign + notificatie

### Fase B: Taak-notities & foto's
- **Nieuwe tabel**: `task_notes` (task_id, volunteer_id, text, photo_url, created_at)
- **Storage bucket**: `task-notes-photos` (public)
- **UI**: In `TaskDetail.tsx` een notitie-sectie met foto-upload
- **Club-kant**: Notities zichtbaar in CommandCenter bij signup-details
- RLS: vrijwilliger kan eigen notities CRUD, club kan lezen

### Fase C: Digitaal certificaat PDF
- **Edge function**: `generate-certificate` — PDF met naam, club-logo, datum, QR-verificatie
- Hergebruik bestaand `generateAccountingPdf.ts` patroon (jsPDF)
- **Nieuwe tabel**: `volunteer_certificates` bestaat al → toevoegen van `pdf_url` kolom + `verification_code`
- Download-knop in AcademyTab + SeasonOverview
- QR linkt naar een publieke verificatiepagina

### Fase D: Kalender-sync
- **Edge function**: `calendar-feed` — genereert .ics feed per vrijwilliger (token-based URL)
- **Nieuwe tabel**: `calendar_tokens` (user_id, token UUID, created_at)
- Per-taak .ics download knop in TaskDetail
- Feed-URL tonen in profiel-instellingen (kopieerbaar)
- iCalendar formaat met VEVENT per toegewezen taak

### Fase E: Achievements & badges
- **Nieuwe tabellen**: `badge_definitions` (key, name_nl/fr/en, description, icon, condition_type, threshold) + `volunteer_badges` (user_id, badge_id, earned_at)
- **Seed data**: ~10 badges (eerste taak, 10/50/100 taken, nachtshift, 5 clubs, 100 uur, etc.)
- **Trigger-logica**: Na taak-voltooiing checken of nieuwe badges verdiend zijn (edge function of client-side)
- **UI**: Badge-sectie in VolunteerDashboard + profiel, met animatie bij nieuw verdiende badge
- Badges zichtbaar voor clubs in VolunteerProfileDialog

### Fase F: Groepschat per event
- **Nieuwe tabel**: `event_chats` (event_id, user_id, message, attachment_url, created_at)
- Realtime via Supabase Realtime (postgres_changes)
- Toegang: alleen vrijwilligers met `task_signups` status='assigned' voor taken in dat event
- UI: Nieuw tabblad of sectie in VolunteerDashboard ("Event Chat")
- RLS: lezen/schrijven alleen voor deelnemers van het event

### Fase G: Social media sharing
- Share-knoppen (Web Share API + fallback) voor:
  - Verdiende badges
  - Seizoensoverzicht (als afbeelding/tekst)
  - Certificaten
- Genereer shareable card (canvas → image of statische template)
- Geen externe API keys nodig — puur client-side Web Share API

---

## Technisch overzicht

| Feature | Nieuwe tabel | Edge function | Storage | Realtime |
|---------|-------------|---------------|---------|----------|
| Wachtlijst-push | — | — | — | — |
| Taak-notities | `task_notes` | — | `task-notes-photos` | — |
| Certificaat PDF | kolom toevoegen | `generate-certificate` | — | — |
| Kalender-sync | `calendar_tokens` | `calendar-feed` | — | — |
| Badges | `badge_definitions` + `volunteer_badges` | — | — | — |
| Groepschat | `event_chats` | — | hergebruik `chat-attachments` | ✅ |
| Social sharing | — | — | — | — |

---

## Aanpak

Ik implementeer de fases één voor één in bovenstaande volgorde (A→G), zodat je na elke fase kunt testen. Elke fase bevat database-migratie, RLS policies, component-code en integratie in het bestaande dashboard.

