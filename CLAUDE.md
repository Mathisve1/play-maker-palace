# CLAUDE.md – Play Maker Palace (De12eMan)

> Dit bestand is de volledige projectcontext voor Claude Code. Lees dit altijd volledig voor je begint met coderen. Dit project is gebouwd via het **Lovable** platform met een GitHub two-way sync.

---

## 1. Project Overview

**Handelsnaam**: De12eMan
**App naam**: Play Maker Palace
**Type**: 2-sided marketplace – vrijwilligers – sportclubs in België
**GitHub repo**: `Mathisve1/play-maker-palace` (public)
**App URL**: https://play-maker-palace.lovable.app
**Supabase project**: `ebxpdscmebdmyqjwmpun`
**Supabase URL**: `https://ebxpdscmebdmyqjwmpun.supabase.co`
**Jurisdictie**: Rechtbanken van Gent
**Privacy contact**: privacy@de12eman.be

---

## 2. Tech Stack

### Frontend
| Technologie | Versie | Gebruik |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Taal |
| Vite | 5.4.19 | Bundler |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui + Radix UI | latest | Component library |
| Framer Motion | 12.x | Animaties |
| React Router DOM | 6.30.1 | Routing |
| TanStack React Query | 5.83.0 | Server state management |
| React Hook Form + Zod | latest | Forms + validatie |
| Recharts | 2.15.4 | Grafieken |
| Leaflet / react-leaflet | 1.9.x | Kaarten |
| jsPDF | 4.1.0 | PDF generatie |
| date-fns | 3.6.0 | Datum utilities |
| canvas-confetti | 1.9.4 | Confetti animaties |
| lucide-react | 0.462.0 | Iconen |
| sonner | 1.7.4 | Toast notifications (naast shadcn Toaster) |
| next-themes | 0.3.0 | Dark/light mode |
| html5-qrcode | 2.3.8 | QR scanner |
| qrcode.react | 4.2.0 | QR generatie |
| @dnd-kit | latest | Drag & drop |
| react-grid-layout | 2.2.2 | Dashboard widget layout |
| react-markdown | 10.1.0 | Markdown rendering |
| embla-carousel-react | 8.6.0 | Carousel |
| vaul | 0.9.9 | Mobile drawer |

### Backend / Infra
| Service | Gebruik |
|---|---|
| Supabase (PostgreSQL) | Database, Auth, RLS, Storage |
| Supabase Edge Functions | Server-side logica (Deno runtime) |
| Supabase Realtime | Live notificaties in VolunteerDashboard |
| DocuSeal (`@docuseal/react`) | Contractondertekening |
| OneSignal (`react-onesignal`) | Push notificaties (legacy, zie ook Web Push) |
| Native Web Push | Eigen VAPID implementatie in `send-native-push` edge function |
| Resend | E-mail verzending via `process-email-queue` edge function |
| Sentry (`@sentry/react`) | Error monitoring |
| PostHog (`posthog-js`) | Product analytics |
| Crisp | Live chat widget |

### Dev Tools
- **lovable-tagger**: Lovable platform integratie (NIET verwijderen)
- **vitest** + `@testing-library/react`: Unit tests
- **ESLint** + TypeScript ESLint: Linting
- **vite-plugin-pwa**: Progressive Web App

---

## 3. Projectstructuur

```
play-maker-palace/
├── src/
│   ├── App.tsx                    # Root – QueryClient, routing, lazy loading
│   ├── App.css
│   ├── assets/logo.png
│   ├── components/                # Gedeelde UI componenten
│   │   ├── ui/                    # shadcn/ui primitives (NIET aanpassen)
│   │   ├── dashboard/             # Widget systeem (DashboardGrid, KpiWidget, ...)
│   │   ├── briefing/              # BriefingBlockLibrary, BriefingPreview, MediaBlockEditor
│   │   ├── community/             # ClubCard, NearbyClubsWidget
│   │   ├── monthly-planning/      # MonthlyCalendarGrid, MonthlyDaySignups, ...
│   │   ├── partner/               # PartnerAttendanceTab, PartnerDashboardHome
│   │   ├── reporting/             # ReportingApiTab, ReportingComplianceTab, ...
│   │   └── safety/                # ClosingProcedureManager, IncidentMap, ...
│   ├── contexts/
│   │   └── ClubContext.tsx        # Centrale auth context voor club-zijde (zie §6)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useActionCount.ts
│   │   ├── useComplianceData.ts
│   │   ├── useMonthlyPlanData.ts
│   │   ├── useTheme.ts
│   │   ├── useTranslation.ts
│   │   └── useVolunteerData.ts    # ⚠️ DEAD CODE – nooit geïmporteerd, veilig te verwijderen
│   ├── i18n/
│   │   ├── LanguageContext.tsx    # NL/FR/EN taalwisseling
│   │   └── translations.ts        # Alle vertalingen
│   ├── integrations/supabase/
│   │   ├── client.ts              # Supabase client instantie
│   │   └── types.ts               # Auto-gegenereerde DB types
│   ├── lib/
│   │   ├── crisp.ts               # Crisp live chat init + route guard
│   │   ├── generateAccountingPdf.ts
│   │   ├── generateInvoicePdf.ts
│   │   ├── generateSafetyReportPdf.ts
│   │   ├── generateSeasonReport.ts
│   │   ├── onesignal.ts           # OneSignal init helper
│   │   ├── posthog.ts             # PostHog analytics
│   │   ├── pushNotifications.ts   # autoResubscribeIfNeeded
│   │   ├── sendPush.ts            # Push helper
│   │   └── utils.ts               # clsx/twMerge cn() helper
│   ├── pages/                     # Alle lazy-loaded pagina's (zie §5)
│   ├── types/
│   │   ├── contract.ts
│   │   └── volunteer.ts
│   └── vite-env.d.ts
├── supabase/
│   ├── config.toml                # Supabase project config + edge function JWT settings
│   ├── functions/                 # Deno edge functions (zie §8)
│   └── migrations/                # SQL migraties (chronologisch, zie §9)
├── public/
│   ├── push-sw.js                 # Service Worker voor Web Push
│   ├── push/push-sw.js
│   ├── pwa-192.png / pwa-512.png
│   ├── robots.txt
│   └── sitemap.xml
├── package.json
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── components.json                # shadcn/ui config
```

---

## 4. Business Model (KRITISCH – lees dit goed)

### Contracttypes (5 categorieën)
Dit zijn louter **categorieën**, geen aparte prijsplannen:
1. `steward`
2. `bar_catering`
3. `terrain_material`
4. `admin_ticketing`
5. `event_support`

Vrijwilligers krijgen **seizoenscontracten** (GEEN maandcontracten).

### Facturatiemodel
```
Per vrijwilliger per seizoen per club:
- Taak 1 voltooid → GRATIS voor de club
- Taak 2 voltooid → GRATIS voor de club
- Taak 3 voltooid → Club betaalt €15 (eenmalig dat seizoen)
- Taak 4, 5, ... → Geen extra kosten (al betaald)
```

**Teller reset** elke nieuw seizoen.
**Stripe**: Uitgesteld met 2 maanden – NIET implementeren.

### Billing trigger (PostgreSQL)
Locatie: `supabase/migrations/20260315134957_536efbfc...sql`

Werking:
- Trigger: `trg_update_volunteer_season_usage` op `task_signups` (AFTER UPDATE)
- Vuurt wanneer: `checked_in_at` verandert van NULL naar een waarde
- Telt op in: `volunteer_season_usage` (club_id + volunteer_id + season_id, UNIQUE)
- Bij count = 3 (v_free_limit + 1): markeert `is_billed = true`, logt in `billing_events`, verhoogt `club_billing.current_season_volunteers_billed`
- Prijs: 1500 cents (€15) default, of club-specifieke `volunteer_price_cents` uit `club_billing`

---

## 5. Pagina's & Routes

Alle pagina's zijn **lazy-loaded** via React `lazy()` in `App.tsx`.

### Publieke routes
| Route | Component |
|---|---|
| `/` | Index |
| `/voor-vrijwilligers` | VolunteerLanding |
| `/voor-clubs` | ClubsLanding |
| `/login` | Login (vrijwilliger) |
| `/club-login` | ClubLogin |
| `/club-signup` | ClubSignup |
| `/signup` | Signup |
| `/community` | Community |
| `/community/club/:id` | CommunityClubDetail |
| `/community/partner/:id` | CommunityPartnerDetail |
| `/reset-password` | ResetPassword |
| `/privacy` | PrivacyPolicy |
| `/terms` | TermsOfUse |
| `/contact` | ContactPage |
| `/partner-login` | PartnerLogin |

### Beveiligde routes (RequireAuth)
| Route | Component | Gebruiker |
|---|---|---|
| `/dashboard` | VolunteerDashboard | Vrijwilliger |
| `/my-clubs` | MyClubs | Vrijwilliger |
| `/profile` | VolunteerProfile | Vrijwilliger |
| `/tasks/:id` | TaskDetail | Vrijwilliger |
| `/chat` | Chat | Vrijwilliger |
| `/notifications` | NotificationCenter | Vrijwilliger |
| `/training` | VolunteerTraining | Vrijwilliger |
| `/help` | VolunteerHelp | Vrijwilliger |
| `/club-dashboard` | ClubOwnerDashboard | Club |
| `/club-dashboard/events` | EventsManager | Club |
| `/club-dashboard/planning` | MonthlyPlanning | Club |
| `/club-dashboard/planning-overview` | PlanningOverview | Club |
| `/club-dashboard/zone-planning` | ZonePlanning | Club |
| `/club-dashboard/volunteers` | VolunteerManagement | Club |
| `/club-dashboard/contract-builder` | ContractBuilder | Club |
| `/club-dashboard/season-contracts` | SeasonContractManager | Club |
| `/club-dashboard/contract-templates` | ContractTemplates | Club |
| `/club-dashboard/briefing-builder` | BriefingBuilder | Club |
| `/club-dashboard/compliance` | ComplianceDashboard | Club |
| `/club-dashboard/loyalty` | LoyaltyPrograms | Club |
| `/club-dashboard/ticketing` | TicketingDashboard | Club |
| `/club-dashboard/ticketing/scan` | TicketScanner | Club |
| `/club-dashboard/sepa` | SepaPayouts | Club |
| `/club-dashboard/academy` | AcademyBuilder | Club |
| `/club-dashboard/academy/physical` | PhysicalTrainings | Club |
| `/club-dashboard/certificates` | CertificateBuilder | Club |
| `/club-dashboard/analytics` | AnalyticsDashboard | Club |
| `/club-dashboard/billing` | BillingDashboard | Club |
| `/club-dashboard/audit` | AuditLog | Club |
| `/club-dashboard/reporting` | ReportingDashboard | Club |
| `/club-dashboard/report-builder` | ReportBuilder | Club |
| `/club-dashboard/safety` | SafetyDashboard | Club |
| `/club-dashboard/safety/overview` | SafetyOverview | Club |
| `/club-dashboard/safety/event/:id` | SafetyEventHub | Club |
| `/club-dashboard/safety/closing/:id` | SafetyClosing | Club |
| `/club-dashboard/partners` | ExternalPartners | Club |
| `/club-dashboard/command-center` | CommandCenter | Club |
| `/club-dashboard/help` | ClubHelp | Club |
| `/club-invite/:token` | ClubInviteAccept | Club |
| `/partner` | PartnerDashboard | Partner |
| `/admin` | AdminDashboard | Admin |
| `/attendance/:eventId` | EventAttendance | – |
| `/stress-test` | StressTest | – |

---

## 6. Auth & Context Patronen

### Club-zijde: ClubContext (ALTIJD gebruiken)

```typescript
import { useClubContext } from '@/contexts/ClubContext';

// Geeft: userId, clubId, clubInfo, profile, isOwner, memberRole, loading, refresh
const { userId, clubId } = useClubContext();
```

**REGEL**: Gebruik **nooit** `supabase.auth.getUser()` of `supabase.auth.getSession()` in club-pagina's/componenten. Gebruik altijd `useClubContext()`.

**Uitzondering**: `AcademyBuilder.tsx` mag `getSession()` gebruiken omdat het `session.access_token` nodig heeft voor edge function calls bij AI quiz/training generatie – dit is legitiem, niet vervangen.

### Vrijwilliger-zijde
Geen centrale context. Vrijwilligerspagina's lezen hun eigen auth state via `supabase.auth.getUser()` of React Query hooks.

### Optionele context
```typescript
import { useOptionalClubContext } from '@/contexts/ClubContext';
// Geeft null als niet binnen ClubProvider – voor herbruikbare componenten
```

---

## 7. Supabase Database (Kerntabellen)

### Gebruikers & Clubs
| Tabel | Beschrijving |
|---|---|
| `profiles` | Gebruikersprofiel (id = auth.uid), bevat `primary_club_id` |
| `clubs` | Sportclubs (owner_id = profiles.id) |
| `club_memberships` | Vrijwilligers die lid zijn van een club (volunteer_id, club_id, status='actief', club_role) |

### Seizoenen & Taken
| Tabel | Beschrijving |
|---|---|
| `seasons` | Seizoenen per club (is_active boolean) |
| `tasks` | Taken/shifts per club, bevat club_id, event_id, datum |
| `task_signups` | Vrijwilliger schrijft in op taak (volunteer_id, task_id, checked_in_at) |

### Billing
| Tabel | Beschrijving |
|---|---|
| `volunteer_season_usage` | Telt voltooide taken per vrijwilliger per seizoen per club (completed_tasks, is_billed) |
| `club_billing` | Billing config per club (volunteer_price_cents, current_season_volunteers_billed) |
| `billing_events` | Auditlog van facturatiegebeurtenissen (event_type: 'volunteer_billed') |

### Communicatie
| Tabel | Beschrijving |
|---|---|
| `notifications` | In-app notificaties (user_id, type, title, message, data, read) |
| `push_subscriptions` | Web Push subscripties per gebruiker |
| `email_queue` | E-mail wachtrij voor `process-email-queue` edge function |

### Planning
| Tabel | Beschrijving |
|---|---|
| `monthly_plans` | Maandplanning per club |
| `events` | Evenementen per club |
| `contracts` | Vrijwilligerscontracten (DocuSeal) |
| `season_contracts` | Seizoenscontracten (5 types) |

### Overig (selectie)
- `loyalty_programs`, `loyalty_points` – loyaliteitsprogramma
- `safety_incidents`, `safety_teams` – veiligheidsbeheer
- `tickets` – ticketing systeem
- `briefings` – taakbriefings
- `training_modules`, `quiz_results` – Academy
- `report_templates`, `generated_reports` – Reporting
- `audit_logs` – audit trail
- `external_partners` – externe partners
- `shift_swaps` – shift ruil

### RLS (Row Level Security)
Alle tabellen hebben RLS ingeschakeld. Gebruik `public.is_club_member(auth.uid(), club_id)` functie voor club-niveau toegangscontrole.

---

## 8. Edge Functions (Supabase / Deno)

Alle functies in `supabase/functions/`. JWT verificatie configuratie in `supabase/config.toml`.

### Communicatie functies
| Functie | JWT | Beschrijving |
|---|---|---|
| `send-native-push` | false | Web Push via VAPID (batches van 10). Input: `{type, user_id, title, message, url, data, broadcast}` |
| `send-push-notification` | false | Alternatieve push (OneSignal?) |
| `push-reminders` | false | Geplande push reminders |
| `process-email-queue` | **true** | Verwerkt `email_queue` tabel via Resend |
| `send-onboarding-emails` | false | Onboarding flow e-mails |
| `send-task-invite-email` | false | Taakuitnodiging per e-mail |
| `send-contact-email` | false | Contact formulier |
| `auth-email-hook` | false | Supabase auth e-mail hook |
| `monthly-reminders` | false | Maandelijkse herinneringen |
| `season-notification-triggers` | false | Seizoensnotificaties |

### AI functies
| Functie | Beschrijving |
|---|---|
| `ai-assistant` | Algemene AI assistent |
| `generate-quiz` | AI quiz generatie voor Academy |
| `generate-training-content` | AI trainingsinhoud |
| `reporting-ai` | AI-gedreven rapportage |
| `translate-content` | Inhoudsvertaling |

### Business logica functies
| Functie | Beschrijving |
|---|---|
| `auto-send-season-contract` | Automatisch seizoenscontract versturen |
| `docuseal` | DocuSeal webhook handler |
| `generate-monthly-invoices` | Maandelijkse facturen |
| `sepa-generate` | SEPA betaalbestanden |
| `ticketing-generate` | Ticketgeneratie |
| `ticketing-scan` | QR ticket scanner |
| `ticketing-webhook` | Ticketing webhook |
| `club-signup` | Club registratie flow |
| `club-invite` | Club uitnodigingen |
| `club-data-api` | Publieke club data API |
| `calendar-feed` | iCal feed |
| `generate-vapid-keys` | VAPID sleutel generatie |

### enqueue_email RPC
```typescript
// Correcte signature voor e-mail in wachtrij plaatsen
await supabase.rpc('enqueue_email', {
  payload: { to, subject, html, ... },  // JSON
  queue_name: 'transactional_emails'    // of 'auth_emails'
});
// Retourneert: number (queue job ID)
```

---

## 9. Migraties

Migraties staan in `supabase/migrations/` – chronologisch gesorteerd op timestamp.

**Meest recente migraties** (maart 2026):
- `20260315134957` – Billing trigger (`update_volunteer_season_usage`), `volunteer_season_usage` tabel
- `20260315151653` t/m `20260315171853` – Diverse bugfixes en uitbreidingen
- `20260314100652` – E-mail infrastructuur (email_queue, enqueue_email RPC)

**REGEL**: Nooit bestaande migraties aanpassen. Altijd nieuwe migraties aanmaken voor schemawijzigingen.

---

## 10. Vrijwilliger Dashboard

### Sidebar navigatie (7 items)
```
Overzicht:
  - Dashboard (tab: 'dashboard')
  - Mijn Taken (tab: 'mine')
  - Kalender (tab: 'monthly')

Beheer:
  - Contracten (tab: 'contracts')
  - Vergoedingen (tab: 'payments')
  - Groeien (tab: 'grow')

Footer:
  - Hulp
  - Uitloggen
```

### VolunteerTab type
```typescript
type VolunteerTab = 'dashboard' | 'mine' | 'monthly' | 'contracts' | 'payments' | 'grow';
```

### Realtime notificaties
`VolunteerDashboard.tsx` luistert via Supabase Realtime naar notificaties van type `'spoed_oproep'` – toont `toast.warning` met taaklink + bonus tekst.

---

## 11. Club Dashboard

### Sidebar navigatie (ClubOwnerSidebar.tsx)
"Help" hoort in de **sidebar footer** (boven uitloggen), NIET in de beheerItems.

### ClubOwnerDashboard.tsx
- **Dubbele `init()` call**: Er staat een dubbele `init()` aanroep op regels 538-540 – verwijder de tweede.
- **Urgency banner**: Toont amber banner voor taken binnen 48h die niet volledig bemand zijn (`urgentTasks`), met "Spoedoproep versturen" knoppen.
- **SpoedoproepDialog**: Integreer per taak via EventsManager.tsx en ClubOwnerDashboard.tsx.

---

## 12. Bekende Problemen (To Fix)

| # | Bestand | Probleem | Ernst |
|---|---|---|---|
| 1 | `ClubOwnerDashboard.tsx` L538-540 | Dubbele `init()` aanroep | Medium |
| 2 | `TermsOfUse.tsx` sectie 4 | Verkeerde billing tekst (fix: "2 voltooide taken gratis, 3e = €15 eenmalig") | Hoog |
| 3 | `AnalyticsDashboard.tsx` | Gebruikt legacy `club_members` tabel i.p.v. `club_memberships` | Hoog |
| 4 | `SeasonContractManager.tsx`, `BillingDashboard.tsx`, `BriefingBuilder.tsx` | Handmatige auth calls i.p.v. `useClubContext()` | Medium |
| 5 | `VolunteerDashboard.tsx` | Dead state `safetyPendingCount`, ongebruikte `validTabs` array | Low |
| 6 | `VolunteerDashboard.tsx` 'mine' tab | Geen empty state bij 0 tickets | Low |
| 7 | `ClubOwnerSidebar.tsx` | "Help" in beheerItems i.p.v. footer | Low |
| 8 | `BillingDashboard.tsx` | Verkeerde event labels, geen uitlegbanner | Medium |
| 9 | `MonthlyPlanning.tsx` | `supabase.auth.getUser()` aanroepen i.p.v. `useClubContext()` | Medium |
| 10 | `VolunteerDashboardHome.tsx` | `requiredTrainings` niet gerendered in "Actie vereist" sectie | Medium |
| 11 | `src/hooks/useVolunteerData.ts` | Dead hook – bestaat maar wordt nergens geïmporteerd | Low |

---

## 13. Componenten die Aandacht Verdienen

### SpoedoproepDialog.tsx
Nieuw component voor urgente oproepen naar vrijwilligerspool. Kenmerken:
- 3-stap dialog: config → preview → resultaat
- Pool = alle vrijwilligers met ≥1 voltooide taak voor de club dit seizoen + actieve `club_memberships`
- Optionele surge bonus (€ bedrag, type: eenmalige bonus / dubbele punten / beide)
- 3 kanalen: push (via `send-native-push`, batches van 10) + in-app (via `notifications` tabel) + e-mail (via `enqueue_email` RPC, queue: 'transactional_emails')
- Countdown timer (48h venster voor taakdatum)
- Vrijwilligers al ingeschreven worden uitgesloten van de pool

### BulkMessageDialog.tsx
Bestaand component voor groepsberichten – niet verwijderen, verwant aan SpoedoproepDialog.

### VolunteerMatcher.tsx
Matching algoritme voor vrijwilligers aan taken.

### AcademyBuilder.tsx
**UITZONDERING**: Mag `supabase.auth.getSession()` gebruiken voor `session.access_token` bij AI edge function calls.

---

## 14. Meertaligheid

De app ondersteunt **NL / FR / EN** via `src/i18n/`.
- Alle UI-teksten moeten in alle 3 talen aanwezig zijn
- `LanguageProvider` wraps de hele app in `App.tsx`
- Gebruik `useTranslation` hook voor vertalingen
- TermsOfUse, PrivacyPolicy: tekst in NL/FR/EN

---

## 15. PWA & Push Notificaties

- Service Worker: `public/push-sw.js` en `public/push/push-sw.js`
- `vite-plugin-pwa` in `vite.config.ts`
- PWA icons: `public/pwa-192.png`, `public/pwa-512.png`
- Auto-resubscribe: `autoResubscribeIfNeeded()` in `App.tsx` (2s delay na mount)
- VAPID sleutels zijn hardcoded in de `send-native-push` edge function

### send-native-push input interface
```typescript
{
  type: string;           // notificatie type (bv. 'spoed_oproep')
  user_id?: string;       // specifieke gebruiker, OF
  broadcast?: boolean;    // stuur naar iedereen
  title: string;
  message: string;
  url?: string;           // deep link
  data?: object;          // extra metadata
}
```

---

## 16. Styling Conventies

- **Utility-first**: Tailwind CSS, geen aparte CSS behalve `App.css`
- **Component library**: shadcn/ui (`src/components/ui/`) – NOOIT aanpassen, gebruik als-is of extend via compositie
- **cn() helper**: `import { cn } from '@/lib/utils'` – altijd gebruiken voor conditionele classes
- **Dark mode**: `next-themes` via `useTheme` hook
- **Animaties**: Framer Motion voor complexe animaties, Tailwind `animate-*` voor eenvoudige

---

## 17. UX voor Digitaal Ongeletterde Gebruikers (KRITISCH)

**De primaire doelgroep van de vrijwilligerskant zijn 50+-jarigen die weinig ervaring hebben met smartphones en apps.** De PWA en website moeten te allen tijde bruikbaar zijn voor deze groep. Dit is een harde designvereiste, geen nice-to-have.

### Verplichte UX-principes

#### Tekst & Leesbaarheid
- **Minimale fontgrootte**: `text-base` (16px) voor bodytekst, `text-lg` of groter voor acties en labels. NOOIT `text-sm` of kleiner voor functionele tekst.
- **Eenvoudige taal**: Schrijf op B1-niveau. Geen jargon, geen afkortingen zonder uitleg. Zeg "Schrijf je in" niet "Sign up". Zeg "Uitloggen" niet "Sessie beëindigen".
- **Korte zinnen**: Eén actie per zin. Geen geneste instructies.

#### Knoppen & Acties
- **Grote aanraakoppervlakken**: Minimum `h-12` (48px) voor alle klikbare elementen op mobiel. Liever `h-14` of `h-16` voor primaire acties.
- **Duidelijke labels**: Knoppen bevatten altijd tekst, nooit alleen een icoon. Iconen mogen ter ondersteuning staan naast tekst.
- **Één primaire actie per scherm**: Vermijd keuzestress. Als er meerdere opties zijn, gebruik een stapsgewijze flow.
- **Bevestigingsfeedback**: Na elke actie (inschrijven, uitschrijven, opslaan) altijd een duidelijke visuele bevestiging tonen (toast + kleurverandering). Geen stille successen.

#### Navigatie
- **Bottomnavigatie op mobiel**: Maximaal 5 items, altijd zichtbaar, grote iconen + labels.
- **Geen verborgen menu's**: Hamburgermenus vermijden waar mogelijk. Als het moet, duidelijk labelen ("Menu").
- **Terugknop altijd aanwezig**: Elke subpagina heeft een zichtbare terugknop bovenaan.
- **Breadcrumbs of paginatitel**: De gebruiker weet altijd waar hij/zij is.

#### Formulieren
- **Één veld per stap** waar mogelijk. Multi-step forms zijn beter dan lange formulieren.
- **Groot invoerveld**: `h-12` minimum voor inputs op mobiel.
- **Foutmeldingen in gewone taal**: "Dit e-mailadres klopt niet" i.p.v. "Invalid email format".
- **Inline validatie**: Toon fouten direct bij het verlaten van een veld, niet pas bij submit.
- **Autocomplete**: Gebruik `autocomplete` attributen correct (email, name, tel).

#### Visueel Design
- **Hoog contrast**: Minimum WCAG AA (4.5:1 ratio) voor alle tekst. Gebruik nooit lichtgrijze tekst op witte achtergrond.
- **Grote iconen**: Minimaal 24px, liever 28-32px voor navigatie-iconen.
- **Duidelijke statuskleurcodering**: Groen = goed/bevestigd, Rood = fout/annulatie, Oranje = aandacht nodig, Blauw = informatie. Consequent toepassen.
- **Vermijd animaties die afleiden**: Subtiele feedback-animaties zijn OK, maar geen visuele ruis.

#### Foutafhandeling & Hulp
- **Vriendelijke foutpagina's**: Bij fouten altijd uitleggen wat er misging én wat de gebruiker kan doen ("Probeer opnieuw" knop altijd aanwezig).
- **Hulpknop altijd bereikbaar**: De Crisp live chat en hulppagina moeten altijd binnen 1 tap bereikbaar zijn.
- **Bevestiging vóór destructieve acties**: "Weet je zeker dat je je wil uitschrijven?" met grote Ja/Nee knoppen.

#### Specifiek voor de Vrijwilligersflow
- **Inschrijven op een taak**: Max 2 taps. Toon datum, tijd, locatie en taaktype duidelijk vóór bevestiging.
- **Status van inschrijving**: Altijd zichtbaar op het dashboard — "Je bent ingeschreven voor X taken".
- **Push notificaties**: Tekst bondig en actiegerecht. "Taak morgen om 14u – Vergeet niet!" i.p.v. technische omschrijvingen.

### Wat NOOIT te doen (UX verboden)
- ❌ Tooltips als enige manier om functionaliteit uit te leggen
- ❌ Kleine checkbox-labels (gebruik grote toggle switches)
- ❌ Datum/tijd pickers zonder duidelijke dag-van-de-week weergave
- ❌ Modals die het volledige scherm blokkeren zonder duidelijke sluitknop
- ❌ Swipe-only navigatie zonder alternatieve knoppen
- ❌ Tekst kleiner dan 16px voor functionele content
- ❌ Acties die niet ongedaan gemaakt kunnen worden zonder waarschuwing

---

## 18. Regels & Verboden

### NOOIT doen
- ❌ Features verwijderen – herorganiseren mag, verwijderen niet
- ❌ Stripe implementeren (uitgesteld 2 maanden)
- ❌ Self check-in feature toevoegen (user wil dit expliciet niet)
- ❌ `supabase.auth.getUser()` / `getSession()` in club-pagina's (gebruik `useClubContext()`)
- ❌ `club_members` tabel gebruiken (legacy, vervangen door `club_memberships`)
- ❌ Bestaande migraties aanpassen
- ❌ shadcn/ui components in `src/components/ui/` aanpassen
- ❌ `lovable-tagger` dev dependency verwijderen

### ALTIJD doen
- ✅ `useClubContext()` voor club auth (behalve AcademyBuilder uitzondering)
- ✅ `club_memberships` tabel gebruiken (met `volunteer_id`, `status='actief'`)
- ✅ Alle teksten in NL + FR + EN
- ✅ RLS policies respecteren bij nieuwe tabellen
- ✅ Nieuwe edge functions registreren in `supabase/config.toml`
- ✅ Seizoenscontracten (geen maandcontracten)
- ✅ TypeScript strict typing
- ✅ `import { cn } from '@/lib/utils'` voor class merging
- ✅ UX-principes uit §17 toepassen op alle vrijwilligerspagina's

---

## 19. Omgevingsvariabelen

Gedefinieerd als `VITE_*` voor frontend, beschikbaar via `import.meta.env`:

```
VITE_SUPABASE_URL=https://ebxpdscmebdmyqjwmpun.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_CRISP_WEBSITE_ID=...
VITE_ONESIGNAL_APP_ID=...
VITE_SENTRY_DSN=...
VITE_POSTHOG_KEY=...
```

Edge functions lezen `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` etc.

---

## 20. Scripts

```bash
npm run dev          # Development server (Vite)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint check
npm run preview      # Preview production build
npm run test         # Vitest unit tests (run once)
npm run test:watch   # Vitest watch mode
```

---

## 21. Claude Code Workflow

### Werken met dit project

Dit project is gebouwd via **Lovable** (AI-gestuurde code editor met GitHub sync). Lovable en Claude Code kunnen beide wijzigingen pushen naar dezelfde GitHub repo.

**Sync strategie**:
1. Pull altijd eerst: `git pull origin main` voor je begint
2. Maak wijzigingen lokaal met Claude Code
3. Commit en push: `git add . && git commit -m "..." && git push origin main`
4. Lovable pikt de wijzigingen automatisch op via de two-way sync

**Supabase migraties lokaal testen**:
```bash
supabase db push          # Migraties toepassen op remote
supabase gen types typescript --project-id ebxpdscmebdmyqjwmpun > src/integrations/supabase/types.ts
```

**Edge functions deployen**:
```bash
supabase functions deploy <functienaam>
```

---

*Laatste update: maart 2026 – §17 toegevoegd: UX-vereisten voor 50+ digitaal ongeletterde gebruikers*
