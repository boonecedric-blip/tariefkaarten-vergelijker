import type { SupplierFormula } from '../types';
import { fetchPdfBuffer, pdfToText, ymCurrent } from './common';
import type { ScrapeResult } from './index';

export async function scrapeTrevion(): Promise<ScrapeResult> {
  const ym = ymCurrent();
  const [yyyy, mm] = ym.split('-');
  // Trevion: https://trevion.be/wp-content/uploads/{YYYY}/{MM}/Tariefkaart-Groene-Energie-Dynamisch-Particulier-{YYYYMM}.pdf
  const url = `https://trevion.be/wp-content/uploads/${yyyy}/${mm}/Tariefkaart-Groene-Energie-Dynamisch-Particulier-${yyyy}${mm}.pdf`;
  const fetched = await fetchPdfBuffer(url);
  if (!fetched) return { supplier: null, error: 'PDF niet gevonden', source: url };
  let text = '';
  try { text = await pdfToText(fetched.buffer); }
  catch (e: any) { return { supplier: null, error: e?.message, source: url }; }

  // Trevion formule (in c€/kWh): "(0,107 × Belpex 15 MTU + 1,3) × 1,06"
  const afnMatch = text.match(/\(\s*([\d.,]+)\s*[×x*]\s*Belpex[^+]+\+\s*([\d.,]+)\s*\)/);
  const injMatch = text.match(/[Ii]njectie[\s\S]{0,120}([\d.,]+)\s*[×x*]\s*Belpex[\s\S]{0,40}[-−–]\s*([\d.,]+)/);

  if (!afnMatch) return { supplier: null, error: 'Geen afnameformule', source: url };
  // Coefficient is in c€/kWh; mult op Belpex EUR/MWh = ×0,1; we werken intern in EUR/MWh
  // Trevion's "0,107" in c€/kWh = 1,07 EUR/MWh per Belpex EUR/MWh? Nee — als input EUR/MWh: result = 0,107 × Belpex_EUR/MWh c€/kWh = 1,07 × Belpex/10... Confusing.
  // Eenvoudig: behandel zoals coefficient in EUR/MWh per EUR/MWh input. Dus mult=0,107 * 10 = 1,07
  const afnameMult = parseFloat(afnMatch[1].replace(',', '.')) * 10;
  const afnameOffset = parseFloat(afnMatch[2].replace(',', '.')) * 10;
  const injMult = injMatch ? parseFloat(injMatch[1].replace(',', '.')) * 10 : 0.86;
  const injOffset = injMatch ? -parseFloat(injMatch[2].replace(',', '.')) * 10 : -5.0;

  const supplier: SupplierFormula = {
    id: 'trevion', naam: 'Trevion', product: 'Groene Energie Dynamisch', indexering: '15',
    afnameMult, afnameOffset, injMult, injOffset,
    vasteJaarExclBTW: 36.79,
    formuleAfname: `Belpex_15 × ${afnameMult.toFixed(3)} + ${afnameOffset.toFixed(2)} EUR/MWh excl. BTW`,
    formuleInjectie: `Belpex_15 × ${injMult.toFixed(3)} − ${(-injOffset).toFixed(2)} EUR/MWh excl. BTW`,
    bronUrl: url,
    bronNaam: 'Trevion Dynamisch (auto-scrape)',
    opmerking: 'GSC + WKK certificaten apart aangerekend (verbruik-gerelateerd).',
  };
  return { supplier, source: url };
}
