
# Plan: Betaalblokkade, Compliance Badge bij Sollicitaties en Notificaties

## Overzicht
Drie verbeteringen aan het compliance-systeem:
1. Server-side betaalblokkade als het jaarplafond bereikt is
2. Compliance badge tonen bij vrijwilligers in het ClubOwnerDashboard
3. Automatische notificaties bij 80% van het plafond

---

## 1. Server-side Betaalblokkade (Edge Function)

De `stripe-create-transfer` edge function wordt uitgebreid met een compliance check voordat de Stripe-betaling wordt aangemaakt.

**Wat gebeurt er:**
- Na authenticatie en validatie wordt het totaal aan betalingen + externe verklaringen van de vrijwilliger opgehaald voor het huidige jaar
- Als het totaal (bestaande inkomsten + nieuw bedrag) boven de EUR 3.233,91 komt, wordt de betaling geweigerd met een duidelijke foutmelding
- Zelfde check voor het urenplafond van 190 uur

**Technische details:**
- Query `volunteer_payments` (status = succeeded) voor het huidige jaar
- Query `compliance_declarations` voor het huidige jaar
- Tel alles op en vergelijk met de limieten
- Retourneer een error met resterend budget als het plafond overschreden wordt

---

## 2. Compliance Badge bij Sollicitaties (ClubOwnerDashboard)

Bij elke vrijwilliger die solliciteert op een taak, wordt een compacte compliance badge (groen/oranje/rood) getoond.

**Wat gebeurt er:**
- Na het laden van alle signups worden de unieke volunteer IDs verzameld
- `fetchBatchComplianceData()` wordt aangeroepen (bestaat al in `useComplianceData.ts`)
- De compliance status wordt opgeslagen in een `complianceMap` state
- Naast de naam van elke vrijwilliger verschijnt een compacte `ComplianceBadge`

**Technische details:**
- Nieuw state: `const [complianceMap, setComplianceMap] = useState<Map<string, ComplianceStatus>>(new Map())`
- Import `fetchBatchComplianceData` en `ComplianceBadge`
- Na het laden van signups: `fetchBatchComplianceData(volunteerIds).then(setComplianceMap)`
- In de signup-rendering: `<ComplianceBadge compliance={complianceMap.get(signup.volunteer_id)} language={language} compact />`

---

## 3. Compliance Notificaties bij 80% Plafond

Automatische in-app notificaties wanneer een vrijwilliger 80% van het plafond bereikt.

**Wat gebeurt er:**
- In de `stripe-create-transfer` edge function: na een succesvolle betaling, controleer of de vrijwilliger nu boven 80% zit
- Zo ja, maak een notificatie aan voor de vrijwilliger ("Let op: je nadert het jaarplafond")
- Maak ook een notificatie aan voor de club owner/penningmeester ("Vrijwilliger X nadert het plafond")

**Technische details:**
- Na het aanmaken van de `volunteer_payments` record in de edge function:
  - Bereken nieuw totaal (bestaande + nieuwe betaling)
  - Als totaal >= 80% van EUR 3.233,91 (= EUR 2.587,13): insert notificatie voor vrijwilliger
  - Als totaal >= 80%: insert notificatie voor club owner
- Notificatie types: `compliance_warning_volunteer` en `compliance_warning_club`
- Voorkom dubbele notificaties door te checken of er al een notificatie van dit type bestaat voor dit jaar

---

## Bestanden die gewijzigd worden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/stripe-create-transfer/index.ts` | Compliance check + notificaties toevoegen |
| `src/pages/ClubOwnerDashboard.tsx` | ComplianceBadge importeren en tonen bij elke vrijwilliger |

Geen database migraties nodig - alle benodigde tabellen bestaan al (`notifications`, `volunteer_payments`, `compliance_declarations`).
