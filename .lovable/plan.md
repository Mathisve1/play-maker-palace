

## Huidige situatie: Waar je mensen accepteert en contracten verstuurt

Er zijn **twee aparte plaatsen** in de app, afhankelijk van het type taak:

### 1. Reguliere taken → **Club Owner Dashboard** (`/club-dashboard`)

Wanneer je een taak uitklapt (klik op de taak-kaart), zie je de lijst van aanmeldingen. Per vrijwilliger heb je:
- **"Toekennen"** knop wanneer status = pending
- Na toekenning verschijnt automatisch een **contract-verstuur dialog** (als de taak een contractsjabloon heeft)
- Na ondertekening verschijnen betaal/uren-knoppen

**Flow:** Vrijwilliger meldt aan → Club klikt "Toekennen" → Contract dialog opent automatisch → Vrijwilliger tekent → Betaling/uren

### 2. Maandplanning → **Maandplanning pagina** (`/monthly-planning`)

Hier zijn **drie aparte secties** (scroll naar beneden voorbij de kalender):

1. **"Ingeschreven vrijwilligers"** — enrollment goedkeuring
   - "Goedkeuren" / "Afwijzen" knoppen bij pending enrollments
   - Na goedkeuring: "Contract" knop verschijnt (via `SendContractConfirmDialog`)
   
2. **"Dag-aanmeldingen te bevestigen"** — dag-toekenning
   - "Toekennen" / "Afwijzen" per dag-aanmelding
   
3. **"Toegekende dag-aanmeldingen"** — ticket generatie
   - "Ticket genereren" en "E-mail ticket" knoppen

### Verschil maandcontract vs. per-taak contract

Bij een maandplanning hoef je **niet per dag een contract te sturen**. Het contract wordt **één keer** verstuurd bij de enrollment-goedkeuring. Daarna kan de vrijwilliger zich vrij aanmelden voor dagen en hoeft de club alleen maar "Toekennen" te klikken + ticket te genereren.

### Samenvatting

| Type | Waar | Accepteren | Contract |
|------|------|-----------|----------|
| Losse taak | Club Dashboard | Per signup "Toekennen" | Automatisch na toekenning |
| Maandplanning enrollment | Maandplanning | "Goedkeuren" bij enrollment | "Contract" knop na goedkeuring |
| Maandplanning dagaanmelding | Maandplanning | "Toekennen" per dag | Niet nodig (maandcontract al getekend) |

