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

Het Vercel-project is gekoppeld aan deze GitHub repo. Elke `git push` naar
`main` triggert automatisch een production deploy. Geen CLI nodig.

```bash
git add .
git commit -m "..."
git push          # Vercel deployt automatisch
```

## Environment variables (Vercel project settings)

| Variabele      | Doel                                                                  | Verplicht |
|----------------|-----------------------------------------------------------------------|-----------|
| `CRON_SECRET`  | Bearer auth voor `/api/scrape` (admin + Vercel cron)                  | Ja        |
| `GITHUB_TOKEN` | Fine-grained PAT (Contents: r/w op deze repo) — gebruikt door scrape  | Ja        |

`GITHUB_TOKEN` moet een Personal Access Token zijn met Contents: read/write op
deze repo. Wordt door `/api/scrape` gebruikt om elke maand een nieuwe
`data/tariefkaarten/YYYY-MM.json` te committen via de GitHub Contents API.

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

Runtime updates door de cron worden gecommit naar deze GitHub repo onder
`data/tariefkaarten/{YYYY-MM}.json`. De commit triggert automatisch een
nieuwe Vercel deployment waarin het nieuwe bestand mee gebundeld wordt.

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
