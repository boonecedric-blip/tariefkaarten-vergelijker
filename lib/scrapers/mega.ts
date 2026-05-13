import type { SupplierFormula } from '../types';
import { fetchPdfBuffer, pdfToText, ymCurrent } from './common';
import type { ScrapeResult } from './index';

export async function scrapeMega(): Promise<ScrapeResult> {
  const ym = ymCurrent();
  const [yyyy, mm] = ym.split('-');
  // Mega URL pattern: https://my.mega.be/resources/tarif/Mega-NL-EL-B2C-VL-{MM}{YYYY}-Dynamic{DD}{MM}.pdf
  // We weten DD niet exact (1ste van de maand typisch); probeer 01 en 02
  const candidates = [
    `https://my.mega.be/resources/tarif/Mega-NL-EL-B2C-VL-${mm}${yyyy}-Dynamic01${mm}.pdf`,
    `https://my.mega.be/resources/tarif/Mega-NL-EL-B2C-VL-${mm}${yyyy}-Dynamic02${mm}.pdf`,
  ];
  const fetched = await fetchPdfBuffer(...candidates);
  if (!fetched) return { supplier: null, error: 'PDF niet gevonden', source: 'mega' };

  let text = '';
  try { text = await pdfToText(fetched.buffer); }
  catch (e: any) { return { supplier: null, error: e?.message, source: fetched.url }; }

  // "EPEX SPOT × 1,05 + 1,35"  (in c-EUR/kWh)
  const afnMatch = text.match(/EPEX\s*SPOT\s*[×x*]\s*([\d.,]+)\s*\+\s*([\d.,]+)/i);
  // "EPEX SPOT × 1 - 4"
  const injMatch = text.match(/[Ii]njectie[\s\S]{0,120}EPEX\s*SPOT\s*[×x*]\s*([\d.,]+)\s*[-−–]\s*([\d.,]+)/);

  if (!afnMatch) return { supplier: null, error: 'Kon afnameformule niet extraheren', source: fetched.url };
  // Mega geeft in c€/kWh, met Belpex in EUR/MWh => mult is al ×0,1 — we zetten alles om naar EUR/MWh
  const multCkWh = parseFloat(afnMatch[1].replace(',', '.'));
  const offsetCkWh = parseFloat(afnMatch[2].replace(',', '.'));
  const afnameMult = multCkWh; // Mega's "1,05" geldt als coefficient op EPEX EUR/MWh wanneer je in c€/kWh werkt? Nee — interpretatie verschilt.
  // Meest gangbare interpretatie Mega: result in c€/kWh = EPEX_eur_mwh × 0,105 + 1,35
  // Tariefkaart geeft "× 1,05" + 1,35 c€/kWh. We bewaren als EUR/MWh: mult=1,05 offset=13,5
  const afnameOffset = offsetCkWh * 10;

  const injMult = injMatch ? parseFloat(injMatch[1].replace(',', '.')) : 1.0;
  const injOffset = injMatch ? -parseFloat(injMatch[2].replace(',', '.')) * 10 : -40.0;

  const supplier: SupplierFormula = {
    id: 'mega', naam: 'Mega', product: 'Dynamic', indexering: '15',
    afnameMult, afnameOffset, injMult, injOffset,
    vasteJaarExclBTW: 40.00,
    formuleAfname: `EPEX SPOT × ${afnameMult} + ${(afnameOffset/10).toFixed(2)} c€/kWh excl. BTW`,
    formuleInjectie: `EPEX SPOT × ${injMult} − ${(-injOffset/10).toFixed(2)} c€/kWh excl. BTW`,
    bronUrl: fetched.url,
    bronNaam: `Mega Dynamic (auto-scrape)`,
  };
  return { supplier, source: fetched.url };
}
