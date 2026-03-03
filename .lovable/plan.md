

## Plan: Maandplanning uitbreiden met 4 features

### 1. Taken kopiëren van vorige maand
**Club-side (`MonthlyPlanning.tsx`)**:
- Knop "Kopieer vorige maand" tonen wanneer een nieuw maandplan wordt aangemaakt en er taken bestaan voor de vorige maand.
- Haalt `monthly_plan_tasks` op voor `month-1`, dupliceert alle rijen met aangepaste `task_date` (zelfde dagnummer, nieuwe maand) en nieuw `plan_id`.
- Dagen die niet bestaan in de nieuwe maand (bv. 31 maart → februari) worden overgeslagen.

### 2. Maandelijkse bundel-uitbetaling
**Database**: Nieuw veld `monthly_payout_id` op `monthly_day_signups` is niet nodig — de bestaande `monthly_payouts` tabel is al aanwezig met `enrollment_id`, `total_days`, `total_hours`, `total_amount`, `status`.

**Club-side (`MonthlyPlanning.tsx`)**:
- Nieuwe sectie "Maandafrekening" onderaan, zichtbaar als er bevestigde uren zijn (`hour_status = 'confirmed'`).
- Groepeert per vrijwilliger: totaal uren, totaal bedrag, aantal dagen.
- Knop "Genereer maandafrekening" maakt een `monthly_payouts` rij aan per vrijwilliger.
- Integratie met bestaande SEPA-engine: knop "Exporteer naar SEPA" maakt `sepa_batch_items` aan op basis van de `monthly_payouts` data, zodat het in de bestaande `/sepa-payouts` flow terechtkomt.

### 3. Club stuurt maandcontract handmatig
**Club-side (`MonthlyPlanning.tsx`)**:
- Bij iedere ingeschreven vrijwilliger in de enrollment-lijst: knop "Contract versturen" (icoon FileSignature).
- Hergebruikt de bestaande `SendContractConfirmDialog` logica maar met het gekoppelde `contract_template_id` van het maandplan.
- Na verzending wordt `contract_status` op de enrollment bijgewerkt naar `'sent'`, na ondertekening naar `'signed'`.

### 4. Dagaanmelding geblokkeerd tot contract getekend
**Volunteer-side (`VolunteerMonthlyTab.tsx`)**:
- Check `enrollment.contract_status !== 'signed'` → "Aanmelden" knop disabled met tooltip "Je moet eerst je contract tekenen".
- Toon duidelijke melding bovenaan: "Je contract is nog niet getekend. Wacht tot de club je contract verstuurt."

### Technische details

**Bestanden die wijzigen:**
- `src/pages/MonthlyPlanning.tsx` — kopieer-functie, contractversturing, SEPA-export
- `src/components/VolunteerMonthlyTab.tsx` — contract-blokkering op dagaanmelding
- Geen nieuwe tabellen nodig; `monthly_payouts` bestaat al
- Geen nieuwe edge functions nodig; bestaande DocuSeal + SEPA flows worden hergebruikt

