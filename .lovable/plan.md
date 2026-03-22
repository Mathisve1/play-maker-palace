

## Plan: Club-logo tonen in push-notificaties

### Wat verandert er?

Momenteel toont elke push-notificatie het standaard app-icoon (`/pwa-192.png`). We gaan dit aanpassen zodat het **logo van de club** die de melding verstuurt zichtbaar is op het lockscreen.

### Aanpak

**1. Edge function (`send-native-push`) — club_id + icon meesturen**
- Accepteer een nieuw optioneel veld `icon` in de request body
- Bij single-user pushes: als er een `club_id` meegegeven wordt maar geen `icon`, haal `logo_url` op uit de `clubs` tabel
- Stuur het `icon`-veld mee in de push payload naar de service worker

**2. Alle bestaande callers — `club_id` meegeven**
- `src/lib/sendPush.ts`: voeg optioneel `clubId` param toe, stuur mee als `club_id`
- `SpoedoproepDialog.tsx`: stuurt al `club_id` via task, geen wijziging nodig
- DB triggers (notify_on_task_signup etc.): deze maken in-app notificaties, geen push — geen wijziging

**3. Service Worker (`push-sw.js`) — icon uit payload gebruiken**
- Lees `payload.icon` uit en gebruik die als `icon` in de notification options
- Fallback naar `/pwa-192.png` als er geen icon meegegeven wordt
- Gebruik `/pwa-192.png` altijd als `badge` (klein monochroom icoon)

### Technisch detail

```
// push-sw.js change
icon: payload.icon || '/pwa-192.png',

// Edge function: resolve club logo
if (body.club_id && !body.icon) {
  const { data: club } = await supabase
    .from('clubs').select('logo_url').eq('id', body.club_id).single();
  if (club?.logo_url) payloadObj.icon = club.logo_url;
}

// sendPush helper: pass club_id through
export async function sendPush({ clubId, ...opts }) {
  // adds club_id to body
}
```

### Bestanden die aangepast worden

| Bestand | Wijziging |
|---|---|
| `public/push/push-sw.js` | `icon` uit payload lezen |
| `public/push-sw.js` | Zelfde aanpassing (duplicate SW) |
| `supabase/functions/send-native-push/index.ts` | Club logo ophalen bij `club_id` |
| `src/lib/sendPush.ts` | `clubId` param doorgeven |

