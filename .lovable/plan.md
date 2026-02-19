
# Fix: QR Scanner Feedbackscherm verschijnt niet

## Oorzaak van het probleem

Er zit een race condition in de `useEffect` die de scanner beheert. De `scannerState` is een dependency van de useEffect, waardoor:

1. Wanneer een QR-code wordt gescand, wordt `setScannerState('processing')` aangeroepen
2. Dit triggert de cleanup van de useEffect (omdat `scannerState` verandert), wat `mounted = false` zet
3. Wanneer de edge function response terugkomt, faalt de `if (mounted)` check
4. `setResult()` en `setScannerState('showing_result')` worden nooit uitgevoerd

## Oplossing

De edge function call moet **buiten** de useEffect-scope worden afgehandeld, zodat de `mounted` variabele niet wordt gereset door state-veranderingen.

### Aanpak:

**Bestand: `src/pages/TicketScanner.tsx`**

1. De scan-callback in de useEffect moet alleen de scanner stoppen en de gescande tekst opslaan in een state/ref
2. Een aparte functie (buiten de useEffect) handelt de API-call af
3. De useEffect beheert alleen de camera lifecycle (starten/stoppen), niet de API-verwerking

### Technische wijzigingen:

- Voeg een `scannedBarcode` state toe die de laatst gescande barcode bijhoudt
- De scan-callback zet alleen: scanner stoppen, barcode opslaan, state naar 'processing'
- Een aparte `useEffect` reageert op `scannedBarcode` en voert de API-call uit (zonder `mounted` probleem)
- Of: gebruik een losse async functie `processBarcode(barcode)` die direct wordt aangeroepen vanuit de callback, maar met een aparte `isMounted` ref die niet wordt gereset door de scanner-useEffect

De eenvoudigste fix: verplaats de API-call logica naar een aparte async functie buiten de useEffect, en gebruik een component-level ref voor mounted-tracking in plaats van de useEffect-scope variabele.
