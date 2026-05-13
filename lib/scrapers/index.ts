import type { SupplierFormula } from '../types';
import { scrapeBolt } from './bolt';
import { scrapeMega } from './mega';
import { scrapeOcta } from './octa';
import { scrapeTrevion } from './trevion';
import { scrapeFrankEnergie } from './frank';

/**
 * Elke scraper retourneert óf een werkende SupplierFormula óf null als het
 * misging. De cron schrijft alleen een snapshot weg als minstens N suppliers
 * werken; voor de rest valt hij terug op de vorige maand-snapshot.
 */
export interface ScrapeResult {
  supplier: SupplierFormula | null;
  error?: string;
  source: string;
}

export const SCRAPERS: Array<{ id: string; naam: string; fn: () => Promise<ScrapeResult> }> = [
  { id: 'bolt',    naam: 'Bolt',           fn: scrapeBolt },
  { id: 'mega',    naam: 'Mega',           fn: scrapeMega },
  { id: 'octa',    naam: 'OCTA+',          fn: scrapeOcta },
  { id: 'trevion', naam: 'Trevion',        fn: scrapeTrevion },
  { id: 'frank',   naam: 'Frank Energie',  fn: scrapeFrankEnergie },
];

export async function runAllScrapers(): Promise<Record<string, ScrapeResult>> {
  const results: Record<string, ScrapeResult> = {};
  await Promise.all(SCRAPERS.map(async s => {
    try {
      results[s.id] = await s.fn();
    } catch (e: any) {
      results[s.id] = { supplier: null, error: e?.message ?? 'unknown', source: 'exception' };
    }
  }));
  return results;
}
