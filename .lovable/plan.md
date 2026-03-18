

## Plan: Spoedoproep-integratie afronden — 4 fixes

### Overzicht
De kernfunctionaliteit werkt, maar 4 concrete zaken ontbreken voor een volledige integratie.

---

### Fix 1: `spoed_oproep` toevoegen aan NotificationCenter TYPE_CONFIG

**Bestand:** `src/pages/NotificationCenter.tsx` (regel 29-38)

Voeg een nieuwe entry toe aan `TYPE_CONFIG`:
```typescript
spoed_oproep: { icon: Zap, label: { nl: 'Spoedoproep', fr: 'Appel urgent', en: 'Urgent call' }, colorClass: 'text-destructive' },
```
`Zap` moet toegevoegd worden aan de lucide-react import.

---

### Fix 2: NotificationBell `hasUrgent` uitbreiden

**Bestand:** `src/components/NotificationBell.tsx` (regel 32)

Wijzig:
```typescript
const hasUrgent = notifications.some(n => !n.read && (n.type === 'urgent' || n.type === 'spoed_oproep'));
```
Dit zorgt ervoor dat spoedoproep-notificaties de rode pulserende badge triggeren.

---

### Fix 3: `start_time` en `end_time` doorsturen naar SpoedoproepDialog

De `tasks` tabel bevat `start_time` en `end_time`, maar de lokale Task-interfaces in beide bestanden missen deze velden.

**Bestand:** `src/pages/ClubOwnerDashboard.tsx`
- Voeg `start_time?: string | null;` en `end_time?: string | null;` toe aan de `Task` interface (regel 66-84)
- Wijzig de SpoedoproepDialog props (regel 1555-1556): `start_time: spoedTask.start_time || null` en `end_time: spoedTask.end_time || null`
- Zorg dat de Supabase `.select()` query voor tasks ook `start_time, end_time` bevat

**Bestand:** `src/pages/EventsManager.tsx`
- Voeg `start_time?: string | null;` en `end_time?: string | null;` toe aan de `Task` interface (regel 37-41)
- Wijzig de SpoedoproepDialog props (regel 1017-1018): `start_time: spoedTask.start_time || null` en `end_time: spoedTask.end_time || null`

---

### Fix 4: Realtime publicatie — reeds actief ✅

De `notifications` tabel is al toegevoegd aan `supabase_realtime` in een eerdere migratie (`20260211132531`). Geen actie nodig.

---

### Samenvatting wijzigingen

| Bestand | Wat |
|---|---|
| `NotificationCenter.tsx` | `Zap` import + `spoed_oproep` in TYPE_CONFIG |
| `NotificationBell.tsx` | `hasUrgent` check uitbreiden |
| `ClubOwnerDashboard.tsx` | Task interface + start/end_time doorsturen |
| `EventsManager.tsx` | Task interface + start/end_time doorsturen |

Geen nieuwe bestanden, geen database-migraties, geen edge functions nodig.

