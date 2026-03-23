

## Plan: Fix Test Configuratie (Punt 2 en 7)

### Probleem

Uit het test rapport:
- **Punt 2**: TC024-TC026 (Events Management) falen door verkeerde login credentials — de URL is al gecorrigeerd naar `/events-manager`, maar de test-account `mathis@gmail.clm` / `mathis123` bestaat niet
- **Punt 7**: TC006, TC027 hebben ook geen werkend club admin test-account — `clubowner.fake@example.com` / `WrongPassword!` is bewust fout (negatieve test), maar TC027 heeft een werkende login nodig

### Aanpak

**1. Standaard test-credentials centraliseren**

Maak een `testsprite_tests/test_config.py` met gestandaardiseerde constanten:
- `CLUB_EMAIL = "club@test.com"`
- `CLUB_PASSWORD = "ClubTest2026!"`
- `VOLUNTEER_EMAIL = "volunteer@test.com"` 
- `VOLUNTEER_PASSWORD = "VolTest2026!"`
- `BASE_URL = "http://localhost:4173"`

**2. Test-account seeden via database migration**

Maak een migration die:
- Een profiel + club aanmaakt voor het test-account (in `profiles` en `clubs` tabellen)
- Een instructie-comment toevoegt dat het auth-account handmatig moet worden aangemaakt via de signup flow (we kunnen niet in `auth.users` schrijven vanuit een migration)

**3. Test-bestanden updaten**

| Bestand | Wijziging |
|---|---|
| `testsprite_tests/test_config.py` | Nieuw — gedeelde constanten |
| `testsprite_tests/TC024_...py` | Import test_config, gebruik correcte credentials |
| `testsprite_tests/TC025_...py` | Idem |
| `testsprite_tests/TC026_...py` | Idem, login via `/club-login` ipv volunteer login |
| `testsprite_tests/TC027_...py` | Import test_config, gebruik correcte credentials |
| `testsprite_tests/TC006_...py` | Geen wijziging nodig (negatieve test met bewust foute credentials) |

**4. Setup-instructies documenteren**

Voeg een `testsprite_tests/README.md` toe met stappen om het test-account aan te maken in de database voordat de tests gedraaid worden.

### Technisch detail

```python
# testsprite_tests/test_config.py
BASE_URL = "http://localhost:4173"
CLUB_LOGIN_URL = f"{BASE_URL}/club-login"
CLUB_EMAIL = "club@test.com"
CLUB_PASSWORD = "ClubTest2026!"
```

```python
# In TC024, TC025, TC026, TC027:
from test_config import BASE_URL, CLUB_LOGIN_URL, CLUB_EMAIL, CLUB_PASSWORD

await page.goto(CLUB_LOGIN_URL)
await page.locator('input[type="email"]').first.fill(CLUB_EMAIL)
await page.locator('input[type="password"]').first.fill(CLUB_PASSWORD)
```

