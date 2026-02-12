
# Briefings opsplitsen: Aanmaken vs. Opvolgen

## Wat verandert er?

De huidige enkele "Briefings" knop in de snelkoppelingen-rij wordt opgesplitst in **twee aparte knoppen**:

1. **"Briefing Builder"** -- Gaat naar een overzicht waar je per taak een briefing kunt aanmaken of bewerken (navigeert naar de builder)
2. **"Opvolging"** -- Opent een overzicht waar je per taak de voortgang van vrijwilligers kunt bekijken (wie heeft wat afgevinkt)

### Snelkoppelingen-rij (bovenaan dashboard)

Huidige situatie:
```text
[ Instellingen ] [ Sjablonen ] [ Leden ] [ Briefings ]
```

Nieuwe situatie:
```text
[ Instellingen ] [ Sjablonen ] [ Leden ] [ Briefings ] [ Opvolging ]
```

- **Briefings** knop: opent een selectielijst van taken, klik op een taak navigeert naar de briefing builder voor die taak
- **Opvolging** knop: opent een selectielijst van taken met briefings, klik op een taak opent de voortgangs-dialog

### Per-taak knoppen

De bestaande knoppen "Briefing" en "Voortgang" per taak blijven behouden -- ze werken al correct en bieden directe toegang.

## Technische details

### Wijzigingen in `src/pages/ClubOwnerDashboard.tsx`

1. **Nieuwe state**: `showBriefingTaskPicker` en `showProgressTaskPicker` (booleans) om de taakselectie-modals te togglen
2. **Snelkoppeling "Briefings"**: In plaats van `setBriefingProgressTaskId(tasks[0].id)`, toont het een kleine takenlijst-popover/dialog waar de gebruiker een taak kiest, waarna naar `/briefing-builder?taskId=...&clubId=...` wordt genavigeerd
3. **Nieuwe snelkoppeling "Opvolging"**: Nieuwe knop met een `Eye` of `BarChart3` icoon. Toont een takenlijst-dialog, klik op een taak opent `BriefingProgressDialog` voor die taak
4. **Vertalingen**: Labels toevoegen voor "Opvolging" / "Suivi" / "Follow-up" in de drie talen

### Nieuwe component: Taakselectie-dialog

Een lichtgewicht dialog die de lijst van taken toont. Wordt hergebruikt voor zowel de briefing-selectie als de opvolging-selectie. Bij klik op een taak:
- Voor briefings: navigeert naar de builder
- Voor opvolging: opent de voortgangs-dialog
