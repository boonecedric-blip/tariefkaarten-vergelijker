import type { SupplierFormula } from '../types';

/**
 * Probeer twee URLs achter elkaar — eerst de gespecifieerde maand-URL, dan de "latest"-URL.
 * Returneert de eerste die een 200 levert.
 */
export async function fetchPdfBuffer(...urls: string[]): Promise<{ buffer: Buffer; url: string } | null> {
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 TariefBot/1.0' } });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return { buffer: Buffer.from(ab), url: u };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

export async function pdfToText(buf: Buffer): Promise<string> {
  // Lazy import omdat pdf-parse soms aan import side-effects heeft
  const pdfParse = (await import('pdf-parse')).default;
  const out = await pdfParse(buf);
  return out.text;
}

/**
 * Extract een nummer uit een PDF-tekst-passage.
 * Zoekt patroon zoals "1,1192" of "1.1192" na een ankerwoord.
 */
export function extractNum(text: string, anchor: RegExp, maxDist = 60): number | null {
  const m = text.match(anchor);
  if (!m) return null;
  const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + maxDist);
  const numMatch = after.match(/[-+]?\d+[.,]?\d*/);
  if (!numMatch) return null;
  return parseFloat(numMatch[0].replace(',', '.'));
}

export function ymCurrent(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function makeFallback(
  prev: SupplierFormula | null,
  overrides: Partial<SupplierFormula>,
  bronUrl: string
): SupplierFormula | null {
  if (!prev) return null;
  return { ...prev, ...overrides, bronUrl };
}
