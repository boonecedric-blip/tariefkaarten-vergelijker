# Vlaamse Dynamische Tarieven — Vergelijker + Tracker

Next.js 14 webapp die maandelijks de tariefkaarten van Vlaamse leveranciers met
een dynamisch elektriciteitscontract bijhoudt en visualiseert.

## Features

- **Vergelijker**: postcode → DNB lookup, fictieve EPEX-prijs invoer, marginale afname/injectie per leverancier inclusief distributie + heffingen + BTW
- **Tijd-slider**: spring naar elke maand in het archief
- **Evolutiegrafiek**: lijngrafiek per leverancier over tijd
- **Maand-over-maand vergelijking**: zij-aan-zij tabel met deltas en changelog
- **Auto-update**: Vercel Cron triggert maandelijks de scrapers (2de van de maand 06:00 UTC)
- **Formule per leverancier**: officiële formule + bron-URL voor elke tariefkaart

## Lokale ontwikkeling

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy naar Vercel

```bash
vercel link
vercel --prod
```

## Environment variables (Vercel project settings)

| Variabele                | Doel                                                   | Verplicht |
|--------------------------|--------------------------------------------------------|-----------|
| `CRON_SECRET`            | Authenticatie voor `/api/scrape` endpoint              | Ja        |
| `KV_REST_API_URL`        | Vercel KV (Redis) endpoint                             | Ja*       |
| `KV_REST_API_TOKEN`      | Vercel KV authenticatie                                | Ja*       |

\* Zonder KV werkt de app, maar de cron-updates zijn niet persistent — alleen de
JSON-bestanden in `/data/tariefkaarten/` worden gebruikt.

## Vercel KV setup

1. In Vercel project → Storage → Create Database → KV (Redis)
2. Connect met dit project
3. Environment variables worden automatisch toegevoegd

## Data structuur

```
data/tariefkaarten/
  ├── 2026-04.json    — maandsnapshot
  └── 2026-05.json
```

Elke snapshot bevat:
- `suppliers[]` — leverancierformules (afname mult/offset, injectie, vaste vergoeding)
- `dnbTarifs{}` — distributietarieven per Fluvius DNB (FA, FHV, FI, FK, FL, FMV, FW, FZD)
- `heffingen{}` — accijns, energiebijdrage, certificaten, BTW%
- `schattingen{}` — jaargemiddelde EPEX voor jaarsimulatie
- `changelog[]` — wijzigingen t.o.v. vorige maand (auto-gegenereerd door scrape)

Runtime updates van de cron worden in **Vercel KV** geschreven onder key
`tariefkaart:{YYYY-MM}` — die overschrijven de basis-JSON-files.

## Scrapers toevoegen

Zie `lib/scrapers/`. Elke leverancier heeft een functie die een `ScrapeResult`
retourneert. Bij falen valt het scrape-endpoint terug op de vorige snapshot,
dus er gaat nooit data verloren.

Werkende MVP-scrapers:
- Bolt (PDF, voorspelbare URL)
- Mega (PDF, YYYYMM-URL)
- OCTA+ (PDF, vaste URL)
- Trevion (PDF, YYYY/MM-URL)
- Frank Energie (PDF, maand-naam URL)

Voor de overige leveranciers (ENGIE, TotalEnergies, Eneco, Luminus, Ecopower,
EBEM) wordt de vorige maand-snapshot hergebruikt totdat een scraper wordt
toegevoegd of je manueel updatet via een PR met een nieuwe `/data/{YYYY-MM}.json`.

## Bronnen

- VREG (Vlaamse Nutsregulator) — distributietarieven 2026
- Fluvius Open Data — postcode → netbeheerder
- FOD Financiën — bijzondere accijns elektriciteit Q1/Q2 2026
- Tariefkaarten leveranciers (mei 2026)

Niet bedoeld als juridische/fiscale referentie — verifieer steeds met de
officiële tariefkaart van de leverancier voor je een contract afsluit.
