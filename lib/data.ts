import fs from 'node:fs/promises';
import path from 'node:path';
import type { MaandSnapshot } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'tariefkaarten');
const KV_PREFIX = 'tariefkaart:';

let kvClient: any = null;
async function getKv(): Promise<any | null> {
  if (kvClient) return kvClient;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const mod = await import('@vercel/kv');
    kvClient = mod.kv;
    return kvClient;
  } catch {
    return null;
  }
}

export async function listMaanden(): Promise<string[]> {
  const set = new Set<string>();
  const kv = await getKv();
  if (kv) {
    try {
      const keys = await kv.keys(`${KV_PREFIX}*`);
      for (const k of keys as string[]) {
        const m = k.replace(KV_PREFIX, '');
        if (/^\d{4}-\d{2}$/.test(m)) set.add(m);
      }
    } catch (e) { console.error('KV list error:', e); }
  }
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
  const kv = await getKv();
  if (kv) {
    try {
      const fromKv = (await kv.get(`${KV_PREFIX}${maand}`)) as MaandSnapshot | null;
      if (fromKv) return fromKv;
    } catch (e) { console.error('KV get error:', e); }
  }
  try {
    const txt = await fs.readFile(path.join(DATA_DIR, `${maand}.json`), 'utf-8');
    return JSON.parse(txt) as MaandSnapshot;
  } catch {
    return null;
  }
}

export async function saveMaand(snapshot: MaandSnapshot): Promise<boolean> {
  const kv = await getKv();
  if (!kv) {
    console.warn('Vercel KV niet geconfigureerd.');
    return false;
  }
  try {
    await kv.set(`${KV_PREFIX}${snapshot.maand}`, snapshot);
    return true;
  } catch (e) { console.error('KV set error:', e); return false; }
}

export async function loadMaanden(maanden: string[]): Promise<MaandSnapshot[]> {
  const results = await Promise.all(maanden.map(m => loadMaand(m)));
  return results.filter((x): x is MaandSnapshot => x !== null);
}
