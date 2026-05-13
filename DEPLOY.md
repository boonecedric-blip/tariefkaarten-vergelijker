# Deploy naar Vercel — stap voor stap

## Eenmalig: Vercel CLI installeren

```bash
npm i -g vercel
vercel login
```

## Deploy

Vanuit de map `tarieven-app/`:

```bash
vercel --yes        # eerste keer: link aan een nieuw project
vercel --prod        # productie deploy
```

De eerste `vercel` vraagt:
- **Set up and deploy?** → Y
- **Which scope?** → kies `boonecedric-blip's projects`
- **Link to existing project?** → N (eerste keer)
- **Project name?** → bv. `vlaamse-tarieven`
- **In which directory is your code located?** → `./` (Enter)
- **Want to modify settings?** → N

Na de eerste deploy krijg je een URL zoals
`https://vlaamse-tarieven-cedric.vercel.app`.

## 1. Vercel KV (Redis) koppelen

Nodig voor de cron om snapshots persistent op te slaan tussen deploys.

1. Open je project op vercel.com → **Storage** tab
2. **Create Database** → **KV** → naam: `tariefkaarten`
3. **Connect Project** → kies `vlaamse-tarieven`
4. Vercel voegt automatisch `KV_REST_API_URL` en `KV_REST_API_TOKEN` toe

Redeploy daarna:
```bash
vercel --prod
```

## 2. CRON_SECRET environment variable

Genereer een random secret en zet hem in Vercel:

```bash
openssl rand -hex 32
# kopieer output

vercel env add CRON_SECRET production
# plak waarde

vercel --prod
```

## 3. Cron testen

Na deploy en KV koppeling:

```bash
# Vervang URL door je Vercel URL en SECRET door je CRON_SECRET
curl -X POST https://vlaamse-tarieven-cedric.vercel.app/api/scrape \
  -H "Authorization: Bearer DEINE_SECRET_HIER"
```

Of via de Admin-pagina van de webapp: `/admin` → CRON_SECRET invullen → "Scrape nu".

## Cron schedule

In `vercel.json` staat:
```json
{ "crons": [{ "path": "/api/scrape", "schedule": "0 6 2 * *" }] }
```

Dit triggert elke **2de van de maand om 06:00 UTC** (= 07:00 of 08:00 lokale tijd).

## Vercel Cron beschikbaarheid

- **Hobby tier** (gratis): cron beschikbaar, max 2 cron jobs, geen wijzigingen
- **Pro tier**: meer cron jobs, betere logging

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| Build faalt op `@vercel/kv` | Het pakket is optioneel — `lib/data.ts` checkt env vars en valt terug op JSON files |
| Cron werkt niet | Check Vercel project → Logs → filter `/api/scrape` |
| Scrape geeft 401 | `CRON_SECRET` ontbreekt of komt niet overeen |
| Scrape geeft fallback voor alle leveranciers | Leverancier wijzigde URL-pattern — pas `lib/scrapers/{naam}.ts` aan |

## Maand handmatig toevoegen

Als de scrape niet werkt voor een specifieke maand, kan je manueel een snapshot toevoegen:
1. Maak `data/tariefkaarten/YYYY-MM.json` aan (gebaseerd op een bestaand)
2. Commit en push (of redeploy)
3. De maand verschijnt automatisch in de tijd-slider
