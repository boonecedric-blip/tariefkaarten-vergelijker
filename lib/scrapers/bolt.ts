import type { SupplierFormula } from '../types';
import { fetchPdfBuffer, pdfToText, extractNum } from './common';
import type { ScrapeResult } from './index';

/**
 * Bolt publiceert tariefkaarten op een voorspelbare URL met een versienummer dat
 * elke maand 1 omhoog gaat. We proberen de huidige + de twee meest recente.
 */
export async function scrapeBolt(): Promise<ScrapeResult> {
  // Probeer een redelijk bereik aan recente versies (van hoog naar laag)
  const baseUrl = 'https://files.boltenergie.be/pricelists/var/bolt_res_el_nl_';
  const versions = Array.from({ length: 18 }, (_, i) => 25 - i); // 25 → 8
  const urls = versions.map(v => `${baseUrl}${v}.pdf`);

  const fetched = await fetchPdfBuffer(...urls);
  if (!fetched) return { supplier: null, error: 'PDF niet gevonden', source: 'bolt' };

  let text = '';
  try { text = await pdfToText(fetched.buffer); }
  catch (e: any) { return { supplier: null, error: 'PDF parse fout: ' + e?.message, source: fetched.url }; }

  // Voorbeeld passages: "Belpex × 1,1192 + 13,94"
  const mult = extractNum(text, /Belpex\s*[×x*]\s*/i, 12);
  // De offset komt na "+ " of "+"
  const offsetMatch = text.match(/Belpex\s*[×x*]\s*[\d.,]+\s*\+\s*([\d.,]+)/i);
  const offset = offsetMatch ? parseFloat(offsetMatch[1].replace(',', '.')) : null;
  // Injectie: "Belpex × 0,94 - 11,33"
  const injMatch = text.match(/[Ii]njectie[\s\S]{0,80}Belpex\s*[×x*]\s*([\d.,]+)\s*[-−–]\s*([\d.,]+)/);
  const injMult = injMatch ? parseFloat(injMatch[1].replace(',', '.')) : null;
  const injOffset = injMatch ? -parseFloat(injMatch[2].replace(',', '.')) : null;

  if (mult == null || offset == null) {
    return { supplier: null, error: 'Kon afnameformule niet extraheren', source: fetched.url };
  }

  const supplier: SupplierFormula = {
    id: 'bolt', naam: 'Bolt', product: 'Variabel + Dynamische Prijzen', indexering: '15',
    afnameMult: mult, afnameOffset: offset,
    injMult: injMult ?? 0.94, injOffset: injOffset ?? -11.33,
    vasteJaarExclBTW: 124.42,
    formuleAfname: `Belpex × ${mult} + ${offset} EUR/MWh (excl. BTW)`,
    formuleInjectie: `Belpex × ${injMult ?? '?'} − ${injOffset != null ? -injOffset : '?'} EUR/MWh (excl. BTW)`,
    bronUrl: fetched.url,
    bronNaam: `Tariefkaart Bolt (auto-scrape)`,
  };
  return { supplier, source: fetched.url };
}
