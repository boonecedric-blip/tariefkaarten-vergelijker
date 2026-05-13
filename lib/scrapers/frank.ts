import type { SupplierFormula } from '../types';
import { fetchPdfBuffer, pdfToText, ymCurrent } from './common';
import type { ScrapeResult } from './index';

const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

export async function scrapeFrankEnergie(): Promise<ScrapeResult> {
  const ym = ymCurrent();
  const [yyyy, mm] = ym.split('-');
  const monthName = NL_MONTHS[parseInt(mm, 10) - 1];
  // Frank-Energie URL pattern (DTC media): we proberen huidige + vorige maand
  const candidates = [
    `https://dtcmedia.s3.eu-central-1.amazonaws.com/tariffcard/nl-be-frank-energie-dynamic-electricity-${monthName}-${yyyy}.pdf`,
  ];
  const fetched = await fetchPdfBuffer(...candidates);
  if (!fetched) return { supplier: null, error: 'PDF niet gevonden', source: candidates[0] };
  let text = '';
  try { text = await pdfToText(fetched.buffer); }
  catch (e: any) { return { supplier: null, error: e?.message, source: fetched.url }; }

  // Frank: "0,1068 × BELPEX_uur + 1,500" in c€/kWh excl
  const afnMatch = text.match(/([\d.,]+)\s*[×x*]\s*BELPEX[^+]+\+\s*([\d.,]+)/);
  const injMatch = text.match(/[Tt]eruglevering[\s\S]{0,120}([\d.,]+)\s*[×x*]\s*BELPEX[\s\S]{0,40}[-−–]\s*([\d.,]+)/);
  if (!afnMatch) return { supplier: null, error: 'Geen afnameformule', source: fetched.url };
  const afnameMult = parseFloat(afnMatch[1].replace(',', '.')) * 10;
  const afnameOffset = parseFloat(afnMatch[2].replace(',', '.')) * 10;
  const injMult = injMatch ? parseFloat(injMatch[1].replace(',', '.')) * 10 : 1.0;
  const injOffset = injMatch ? -parseFloat(injMatch[2].replace(',', '.')) * 10 : -11.50;

  const supplier: SupplierFormula = {
    id: 'frank', naam: 'Frank Energie', product: 'Dynamisch', indexering: 'h',
    afnameMult, afnameOffset, injMult, injOffset,
    vasteJaarExclBTW: 33.06,
    formuleAfname: `Belpex_H × ${afnameMult.toFixed(3)} + ${afnameOffset.toFixed(2)} EUR/MWh (excl. BTW)`,
    formuleInjectie: `Belpex_H × ${injMult.toFixed(3)} − ${(-injOffset).toFixed(2)} EUR/MWh (excl. BTW)`,
    bronUrl: fetched.url,
    bronNaam: 'Frank Energie Dynamic (auto-scrape)',
  };
  return { supplier, source: fetched.url };
}
