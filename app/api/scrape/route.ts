import { NextResponse } from 'next/server';
import { runAllScrapers } from '@/lib/scrapers';
import { listMaanden, loadMaand, saveMaand } from '@/lib/data';
import { ymCurrent } from '@/lib/scrapers/common';
import type { MaandSnapshot, SupplierFormula } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST/GET /api/scrape
 *
 * Authenticatie: Authorization: Bearer ${CRON_SECRET}
 * Vercel Cron stuurt deze header automatisch.
 *
 * Werking:
 * 1. Voor elke leverancier: probeer scrape; bij falen → fallback naar vorige maand-snapshot
 * 2. Combineer met laatste snapshot voor DNB-tarifs en heffingen (die wijzigen jaarlijks)
 * 3. Commit nieuwe maand-JSON naar GitHub repo (triggert auto-deploy)
 */
async function handle(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ym = ymCurrent();
  const beschikbareMaanden = await listMaanden();
  const vorigeMaand = beschikbareMaanden.find(m => m !== ym) ?? beschikbareMaanden[0];
  const vorigeSnapshot = vorigeMaand ? await loadMaand(vorigeMaand) : null;

  const scrapeResults = await runAllScrapers();
  const succeeded: SupplierFormula[] = [];
  const failedIds: string[] = [];

  // Voeg gescraped + fallbacks samen tot volledige lijst
  const allIds = new Set<string>();
  if (vorigeSnapshot) vorigeSnapshot.suppliers.forEach(s => allIds.add(s.id));
  Object.keys(scrapeResults).forEach(id => allIds.add(id));

  for (const id of allIds) {
    const res = scrapeResults[id];
    if (res?.supplier) {
      succeeded.push(res.supplier);
    } else if (vorigeSnapshot) {
      const prev = vorigeSnapshot.suppliers.find(s => s.id === id);
      if (prev) {
        succeeded.push(prev);
        if (res) failedIds.push(id);
      }
    }
  }

  if (succeeded.length === 0 || !vorigeSnapshot) {
    return NextResponse.json({
      error: 'Geen leverancier kon worden ge-actualiseerd en geen fallback beschikbaar.',
      details: scrapeResults,
    }, { status: 500 });
  }

  const snapshot: MaandSnapshot = {
    maand: ym,
    scrapeDatum: new Date().toISOString(),
    suppliers: succeeded,
    dnbTarifs: vorigeSnapshot.dnbTarifs,
    heffingen: vorigeSnapshot.heffingen,
    schattingen: vorigeSnapshot.schattingen,
    changelog: buildChangelog(vorigeSnapshot.suppliers, succeeded),
  };

  const ok = await saveMaand(snapshot);
  return NextResponse.json({
    ok, maand: ym,
    leveranciersGescraped: Object.fromEntries(
      Object.entries(scrapeResults).map(([k, v]) => [k, v.supplier ? 'ok' : `fail: ${v.error}`])
    ),
    fallback: failedIds,
    snapshot: { maand: snapshot.maand, supplierCount: snapshot.suppliers.length },
    persistent: ok ? 'GitHub commit (triggert nieuwe deploy)' : 'NIET OPGESLAGEN (GITHUB_TOKEN ontbreekt of API faalde)',
  });
}

function buildChangelog(prev: SupplierFormula[], next: SupplierFormula[]): string[] {
  const log: string[] = [];
  for (const n of next) {
    const p = prev.find(x => x.id === n.id);
    if (!p) { log.push(`Nieuwe leverancier: ${n.naam}`); continue; }
    if (Math.abs(p.afnameOffset - n.afnameOffset) > 0.01) {
      const delta = n.afnameOffset - p.afnameOffset;
      log.push(`${n.naam}: afname-opslag ${delta > 0 ? '+' : ''}${delta.toFixed(2)} EUR/MWh`);
    }
    if (Math.abs(p.injOffset - n.injOffset) > 0.01) {
      const delta = n.injOffset - p.injOffset;
      log.push(`${n.naam}: injectie-aftrek ${delta > 0 ? '+' : ''}${delta.toFixed(2)} EUR/MWh (positief = beter)`);
    }
    if (Math.abs(p.vasteJaarExclBTW - n.vasteJaarExclBTW) > 0.5) {
      const delta = n.vasteJaarExclBTW - p.vasteJaarExclBTW;
      log.push(`${n.naam}: vaste vergoeding ${delta > 0 ? '+' : ''}€${delta.toFixed(2)}/jaar`);
    }
  }
  return log.length ? log : ['Geen tariefswijzigingen t.o.v. vorige maand.'];
}

export const POST = handle;
export const GET = handle;
