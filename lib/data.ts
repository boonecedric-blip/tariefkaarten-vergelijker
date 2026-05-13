import fs from 'node:fs/promises';
import path from 'node:path';
import type { MaandSnapshot } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'tariefkaarten');

/**
 * Lijst alle beschikbare maanden op basis van de JSON files in
 * data/tariefkaarten/. De data komt mee in de Vercel deployment bundle,
 * dus reads zijn pure filesystem reads (geen netwerk).
 */
export async function listMaanden(): Promise<string[]> {
  const set = new Set<string>();
  try {
    const files = await fs.readdir(DATA_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) set.add(f.replace('.json', ''));
    }
  } catch {}
  return Array.from(set).sort().reverse();
}

export async function loadMaand(maand: string): Promise<MaandSnapshot | null> {
  if (!/^\d{4}-\d{2}$/.test(maand)) return null;
  try {
    const txt = await fs.readFile(path.join(DATA_DIR, `${maand}.json`), 'utf-8');
    return JSON.parse(txt) as MaandSnapshot;
  } catch {
    return null;
  }
}

export async function loadMaanden(maanden: string[]): Promise<MaandSnapshot[]> {
  const results = await Promise.all(maanden.map(m => loadMaand(m)));
  return results.filter((x): x is MaandSnapshot => x !== null);
}

/**
 * Persist een MaandSnapshot door 'm te committen als JSON file naar de
 * GitHub repo onder data/tariefkaarten/{maand}.json. Vercel detecteert
 * de commit en triggert automatisch een nieuwe deployment waarin de
 * nieuwe file mee wordt gebundeld.
 *
 * Vereist env vars:
 *   GITHUB_TOKEN        - Fine-grained PAT met Contents: read/write op de repo
 *   GITHUB_REPO         - optioneel, default 'boonecedric-blip/tariefkaarten-vergelijker'
 *   GITHUB_BRANCH       - optioneel, default 'main'
 */
export async function saveMaand(snapshot: MaandSnapshot): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN niet geconfigureerd; tariefkaart niet persistent opgeslagen.');
    return false;
  }
  const repo = process.env.GITHUB_REPO || 'boonecedric-blip/tariefkaarten-vergelijker';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filePath = `data/tariefkaarten/${snapshot.maand}.json`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const content = Buffer.from(JSON.stringify(snapshot, null, 2)).toString('base64');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tarieven-app-scraper',
    'X-GitHub-Api-Version': '2022-11-28',
  } as const;

  // Bestaande sha ophalen indien file al bestaat (anders krijgen we 422 bij PUT)
  let sha: string | undefined;
  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (getRes.ok) {
      const data = await getRes.json() as { sha?: string };
      sha = data.sha;
    }
  } catch { /* file bestaat nog niet; sha blijft undefined */ }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `chore(data): tariefkaart ${snapshot.maand} via automated scrape`,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => '');
    console.error(`GitHub commit failed (${putRes.status}):`, txt.slice(0, 500));
    return false;
  }
  return true;
}
