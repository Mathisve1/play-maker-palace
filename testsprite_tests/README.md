# E2E Test Setup

## Vereisten

- Python 3.9+
- Playwright (`pip install playwright && playwright install chromium`)
- App draait op `http://localhost:4173` (production build preview)

## Test Accounts

De tests gebruiken gecentraliseerde credentials uit `test_config.py`:

| Rol | Email | Wachtwoord |
|---|---|---|
| Club eigenaar | `test@test.com` | `Test123?` |
| Vrijwilliger | `vaneeckhoutmathis4@gmail.com` | `Mathis123?` |

### Account aanmaken

Deze accounts moeten bestaan in de Supabase Auth database. Maak ze aan via de signup flow van de app:

1. Ga naar `/club-signup` en registreer met `test@test.com` / `Test123?`
2. Ga naar `/signup` en registreer met `vaneeckhoutmathis4@gmail.com` / `Mathis123?`

## Tests draaien

```bash
cd testsprite_tests
python TC001_*.py
python TC024_*.py
# etc.
```

## Structuur

- `test_config.py` — Gedeelde constanten (URLs, credentials, timeouts)
- `TC001-TC023` — Vrijwilliger-zijde tests
- `TC024-TC027` — Club-zijde tests (Events Manager)
- `TC006` — Negatieve test (bewust foute credentials, geen wijziging nodig)
