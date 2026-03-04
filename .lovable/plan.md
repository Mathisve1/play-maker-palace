

## Probleem

De oude `onesignal_player_id` waarden in de database horen bij het **vorige** OneSignal project en zijn ongeldig. Gebruikers hoeven niet handmatig uit/aan te zetten — we kunnen dit automatisch oplossen.

## Plan

### 1. Database reset via migratie
- Zet alle `onesignal_player_id` waarden op `NULL` en `push_notifications_enabled` op `false`
- Reset `push_prompt_seen` (of de v2 variant) zodat de banner opnieuw verschijnt

### 2. Resultaat
- Bij het volgende bezoek aan de app wordt de nieuwe OneSignal SDK geïnitialiseerd
- De PushPermissionBanner verschijnt opnieuw → gebruiker klikt "inschakelen" → nieuw Player ID wordt aangemaakt en opgeslagen
- Geen handmatige actie nodig buiten één klik op de banner

