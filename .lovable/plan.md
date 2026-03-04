

## Analyse

Je hebt een **nieuw OneSignal project** aangemaakt met nieuwe credentials:
- **App ID**: `d1373810-d2ca-4689-8858-178e45d144c4` (was `e0d35921-...`)
- **Safari Web ID**: `web.onesignal.auto.69a0d04c-4cfa-4f80-8d34-652264ce8748`

Deze moeten op 3 plekken worden bijgewerkt.

## Plan

### 1. Update `src/lib/onesignal.ts`
- Wijzig `ONESIGNAL_APP_ID` naar `d1373810-d2ca-4689-8858-178e45d144c4`
- Wijzig `safari_web_id` naar `web.onesignal.auto.69a0d04c-4cfa-4f80-8d34-652264ce8748`
- Voeg `setDefaultUrl("https://play-maker-palace.lovable.app")` toe na init
- Verwijder de CDN script-tag aanpak (we gebruiken al de npm SDK `react-onesignal`)

### 2. Update edge function secret
- Wijzig de `ONESIGNAL_APP_ID` fallback in `supabase/functions/send-push-notification/index.ts` naar de nieuwe App ID
- Voeg `web_url` toe aan push payloads

### 3. Update edge function secret in backend
- Stel de `ONESIGNAL_APP_ID` secret in op de nieuwe waarde zodat de edge function het juiste project target

### 4. Test push notificatie
- Stuur een test-push naar testermathis@gmail.com om te bevestigen dat alles werkt

