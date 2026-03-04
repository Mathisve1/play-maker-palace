

## Native Web Push zonder OneSignal

Ja, dit is mogelijk via de **Web Push API** met **VAPID keys**. Dit is een browserstandaard die werkt zonder externe diensten.

### Hoe het werkt

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  PWA Client  │────▶│  Service     │────▶│  Browser Push   │
│  (subscribe) │     │  Worker      │     │  Service (FCM/  │
│              │     │  (receive)   │     │  APNs/Mozilla)  │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                ▲
                                                │
                                         ┌──────┴──────┐
                                         │  Supabase   │
                                         │  Edge Func  │
                                         │  (web-push) │
                                         └─────────────┘
```

1. **VAPID key pair** genereren (eenmalig, public + private key)
2. **Client**: `navigator.serviceWorker` + `PushManager.subscribe()` → krijgt een `PushSubscription` (endpoint + keys)
3. **Database**: sla de subscription op in een `push_subscriptions` tabel
4. **Edge Function**: gebruik de `web-push` library om berichten te sturen naar de opgeslagen endpoints
5. **Service Worker**: luistert op `push` event en toont de notificatie

### Wat verandert

| Onderdeel | Nu (OneSignal) | Straks (Native) |
|-----------|---------------|-----------------|
| SDK | react-onesignal (~50KB) | Geen extra library |
| Dashboard | OneSignal.com | Eigen UI |
| Kosten | Gratis tier limiet | Gratis, onbeperkt |
| iOS Safari | Vereist Add-to-Home-Screen | Zelfde vereiste (Apple-beperking) |
| Complexiteit | Laag | Medium (zelf bouwen) |

### Implementatieplan

**1. Database: `push_subscriptions` tabel**
- Kolommen: `id`, `user_id` (FK profiles), `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`
- RLS: gebruikers beheren eigen subscriptions

**2. VAPID keys als secrets opslaan**
- Genereer VAPID key pair
- Sla `VAPID_PUBLIC_KEY` en `VAPID_PRIVATE_KEY` op als secrets

**3. Service Worker uitbreiden**
- Voeg `push` en `notificationclick` event listeners toe aan de bestaande PWA service worker

**4. Client-side subscribe flow**
- Vervang OneSignal init door `PushManager.subscribe()` met de VAPID public key
- Sla subscription op in `push_subscriptions` tabel
- Update `PushPermissionBanner` en profiel-toggle

**5. Edge Function: `send-native-push`**
- Gebruik `web-push` npm package (beschikbaar in Deno)
- Leest subscriptions uit DB, stuurt naar browser push endpoints

**6. Bestaande triggers migreren**
- `monthly-reminders` en `send-push-notification` herschrijven naar native web-push

### Belangrijk nadeel

- **iOS Safari**: de Web Push API werkt hier **alleen** als PWA (Add to Home Screen). Dit is een Apple-beperking die ook geldt voor OneSignal. Er is geen verschil.
- **Zelf onderhouden**: geen analytics dashboard, geen A/B testing, geen segmentatie out-of-the-box.

### Aanbeveling

Als OneSignal-origin-problemen het hoofdprobleem zijn, is native web push een goede oplossing. Je elimineert de SDK-afhankelijkheid en het origin-conflict volledig. De implementatie vergt ~6 bestanden maar is volledig binnen Lovable te bouwen.

