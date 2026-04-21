

## Plan: Partner-leden uitnodigen tijdelijk uitschakelen vanaf partner-zijde

### Context
Op dit moment kunnen partners via hun eigen portaal (`/partner`) leden toevoegen aan hun organisatie via "Medewerker toevoegen". De club-kant (`/club-dashboard/partners` → `ExternalPartners.tsx`) kan die leden vervolgens uitnodigen als vrijwilliger via e-mail.

Je wil voorlopig dat **partners zelf** geen vrijwilligers-uitnodigingen kunnen versturen of triggeren — enkel de club mag dit doen.

### Wat aanpassen

**1. PartnerDashboard.tsx** (`/partner`)
- Geen wijziging nodig: er staat momenteel géén "Uitnodigen als vrijwilliger" knop. Leden kunnen alleen worden toegevoegd, bewerkt en verwijderd. ✅ Al conform.

**2. ExternalPartners.tsx** (`/club-dashboard/partners`) — clubzijde
- Hier blijft alles werken: de club kan leden van een partner zien en ze uitnodigen via "Uitnodigen als vrijwilliger". Geen wijziging nodig.

**3. Toevoegen: duidelijke uitleg in PartnerDashboard**
- In de "Medewerkers"-tab (waar de partner zijn leden beheert) een kleine **info-banner** tonen boven de lijst:
  > *"Wil je dat één van je medewerkers een vrijwilligersaccount krijgt? Vraag dit aan je contactpersoon bij de club. Zij kunnen vanuit hun beheerportaal een uitnodiging versturen."*
- Drietalig (NL/FR/EN) volgens de standaard `t3()`-helper.
- Stijl: lichte achtergrond (`bg-muted/30`), `Info`-icoontje van lucide, padding `p-4 rounded-2xl`, `text-sm` (≥14px voor uitleg-context, dit is non-functioneel, voldoet aan §17).

### Wat NIET aanpassen
- De edge function `club-invite` blijft volledig functioneel — de club gebruikt deze nog steeds.
- De `partner_members.user_id` linking-logica (eerder besproken in `claude_code_partner_flow_fix.md`) blijft intact voor wanneer de club wel een uitnodiging verstuurt.
- De `VolunteerPartnerTab.tsx` blijft werken voor leden die wél al gelinkt zijn.

### Bestand dat gewijzigd wordt
- `src/pages/PartnerDashboard.tsx` — alleen UI-banner toevoegen in de Members-tab sectie (rond de bestaande lijst, vóór de "Medewerker toevoegen" knop).

### Resultaat
- Partners zien duidelijk dat zij **niet zelf** vrijwilligersuitnodigingen kunnen sturen.
- De flow loopt volledig via de club, wat past bij het huidige rechtenmodel.
- Geen DB-migratie, geen edge function changes, puur cosmetisch + UX-verduidelijking.

