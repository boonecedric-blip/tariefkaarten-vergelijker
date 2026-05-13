import type { SupplierFormula } from '../types';
import { fetchPdfBuffer, pdfToText } from './common';
import type { ScrapeResult } from './index';

export async function scrapeOcta(): Promise<ScrapeResult> {
  // OCTA+ heeft een vaste URL voor de actuele tariefkaart
  const url = 'https://files.octaplus.be/tariffs/E_OCTA_DYNAMIC_RE_VL_NL.pdf';
  const fetched = await fetchPdfBuffer(url);
  if (!fetched) return { supplier: null, error: 'PDF niet gevonden', source: url };
  let text = '';
  try { text = await pdfToText(fetched.buffer); }
  catch (e: any) { return { supplier: null, error: e?.message, source: url }; }

  // OCTA+ formule "Epex 15' × 1,083 + 4,17" (in EUR/MWh)
  const afnMatch = text.match(/[Ee][Pp][Ee][Xx][^×x*]{0,15}[×x*]\s*([\d.,]+)\s*\+\s*([\d.,]+)/);
  const injMatch = text.match(/[Ii]njectie[\s\S]{0,120}[Ee][Pp][Ee][Xx][^×x*]{0,15}[×x*]\s*([\d.,]+)\s*[-−–]\s*([\d.,]+)/);

  if (!afnMatch) return { supplier: null, error: 'Geen formule gevonden', source: url };
  const afnameMult = parseFloat(afnMatch[1].replace(',', '.'));
  const afnameOffset = parseFloat(afnMatch[2].replace(',', '.'));
  const injMult = injMatch ? parseFloat(injMatch[1].replace(',', '.')) : 1.0;
  const injOffset = injMatch ? -parseFloat(injMatch[2].replace(',', '.')) : -13.89;

  const supplier: SupplierFormula = {
    id: 'octa', naam: 'OCTA+', product: 'Dynamic', indexering: '15',
    afnameMult, afnameOffset, injMult, injOffset,
    vasteJaarExclBTW: 0.00,
    formuleAfname: `EPEX_15 × ${afnameMult} + ${afnameOffset.toFixed(2)} EUR/MWh excl. BTW`,
    formuleInjectie: `EPEX_15 × ${injMult} − ${(-injOffset).toFixed(2)} EUR/MWh excl. BTW`,
    bronUrl: url,
    bronNaam: 'OCTA+ Dynamic (auto-scrape)',
  };
  return { supplier, source: url };
}
