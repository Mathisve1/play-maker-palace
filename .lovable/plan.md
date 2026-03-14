
# Volledige Audit – Maart 2026

## PWA & Safe Area (urgent - jouw klacht over tekst achter statusbar)

### P1. Mobile header hoogte telt safe-area-inset-top niet mee
**Probleem:** `DashboardLayout.tsx` header is `h-14` (56px) met `paddingTop: env(safe-area-inset-top)`. Maar omdat `h-14` de TOTALE hoogte is, wordt de content IN de header samengeperst achter de statusbar (batterij/uur). Hetzelfde geldt voor `Chat.tsx`, `TicketScanner.tsx` en `TicketingDashboard.tsx`.
**Oplossing:** Verander van vaste `h-14` naar `min-h-14` + `pt-safe-top`, zodat de header GROEIT op iOS/Android PWA. Of gebruik een wrapper-div voor de safe area padding boven de header content.

### P2. Chat pagina mist sidebar-layout
**Probleem:** Chat gebruikt een eigen header + navigatie ipv `DashboardLayout` of `ClubPageLayout`. Inconsistente ervaring: geen sidebar, geen hamburger menu, terug-knop navigeert naar dashboard maar je verliest sidebar-context.
**Oplossing:** Chat integreren in `DashboardLayout` met de juiste sidebar per rol.

---

## Data & Performance

### P3. VolunteerDashboard init() doet 20+ queries sequentieel
**Probleem:** De `init()` functie in VolunteerDashboard (1188 regels) laadt taken, signups, payments, SEPA, contracten, tickets, loyalty, certificates, follows – allemaal SEQUENTIEEL. Geen `Promise.all()` waar mogelijk. Laadtijd op mobiel is merkbaar.
**Oplossing:** Groepeer onafhankelijke queries in `Promise.all()` blokken. Splits init in parallelle fasen.

### P4. CommandCenter herlaadt ALLES bij elke realtime change
**Probleem:** Lijn 286-289: elke `task_signups`, `monthly_enrollments`, of `monthly_day_signups` change triggert een volledige `loadData()` – dit doet 10+ queries opnieuw. Bij drukke events kan dit elke seconde triggeren.
**Oplossing:** Debounce met 500ms, of targeted updates per change type.

### P5. TicketingDashboard pollt elke 5 seconden
**Probleem:** Lijn 323-336: een `setInterval(5000)` pollt de volledige tickets-tabel, ook als de tab inactief is. Verspilt resources.
**Oplossing:** Gebruik `document.visibilityState` check, of vervang polling door pure realtime subscriptions (die al bestaan op lijn 308-321).

### P6. Volunteer live-event polling elke 3 seconden
**Probleem:** VolunteerDashboard lijn 439-442: pollt elke 3 seconden voor live events, naast de realtime subscriptions die er al zijn. Overkill.
**Oplossing:** Verhoog interval naar 15-30 seconden, of verwijder polling en vertrouw op de realtime channels.

---

## UX & Navigatie

### P7. Geen loading skeletons, alleen spinners
**Probleem:** Alle dashboards tonen een centered spinner bij initial load. Op mobiel lijkt het alsof de app "leeg" is tot alles geladen is. Geen visuele hint over de structuur.
**Oplossing:** Skeleton placeholders voor KPI cards, takenlijst, sidebar content.

### P8. VolunteerDashboard.tsx is 1188 regels – niet gerefactord
**Probleem:** Vergelijkbaar met ClubOwnerDashboard vóór refactor. Eén component met 30+ state variabelen, init() van 200 regels, en alle tab-renders inline.
**Oplossing:** Extract `VolunteerDashboardTab`, `VolunteerPaymentsTab`, `VolunteerContractsTab`, etc.

### P9. MonthlyPlanning.tsx is 971 regels
**Probleem:** Bevat calendar rendering, task CRUD, enrollment management, day signup management, ticket generation, payout generation – alles in 1 component.
**Oplossing:** Extract `MonthlyCalendar`, `MonthlyEnrollmentList`, `MonthlyDaySignupManager`.

### P10. Duplicate club-finding logic in 8+ pagina's
**Probleem:** CommandCenter, TicketingDashboard, TicketScanner, MonthlyPlanning, ClubPageLayout – allemaal dupliceren dezelfde "find club by owner_id OR club_members" logica.
**Oplossing:** Maak een `useClub()` hook die dit centraal afhandelt.

---

## Veiligheid & Code Quality

### P11. Veel `(supabase as any)` casts
**Probleem:** 15+ plekken waar Supabase queries gecast worden naar `any`, wat type safety volledig uitschakelt. Bugs worden niet gevangen door TypeScript.
**Oplossing:** Database types updaten en proper typeren, of expliciete type assertions gebruiken.

### P12. Auth guard is niet centraal
**Probleem:** Elke pagina doet een eigen `getSession()` check met redirect. Als er een race condition is of de session expire, krijg je inconsistent gedrag.
**Oplossing:** Een `<RequireAuth>` wrapper component die sessie centraal controleert.

---

## Aanbevolen prioriteit

| # | Upgrade | Impact | Moeite | Gebied |
|---|---------|--------|--------|--------|
| P1 | Safe area header fix (PWA statusbar) | **Kritiek** | Klein | PWA |
| P3 | Parallel queries VolunteerDashboard | Hoog | Medium | Performance |
| P4 | CommandCenter debounce | Hoog | Klein | Performance |
| P5 | Ticketing polling optimalisatie | Medium | Klein | Performance |
| P6 | Volunteer live-event polling reduceren | Medium | Klein | Performance |
| P7 | Loading skeletons | Medium | Medium | UX |
| P10 | useClub() hook extracten | Medium | Medium | Code quality |
| P8 | VolunteerDashboard refactor | Medium | Groot | Code quality |
| P9 | MonthlyPlanning refactor | Medium | Groot | Code quality |
| P2 | Chat sidebar-integratie | Laag | Medium | UX |
| P11 | Supabase type safety | Laag | Medium | Code quality |
| P12 | Centrale auth guard | Laag | Medium | Security |

Geef aan welke je wilt aanpakken.
