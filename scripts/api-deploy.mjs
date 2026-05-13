// Deploy direct via Vercel REST API (zonder CLI).
// Vereist VERCEL_TOKEN in env.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = 'team_4cqNSzmH3pnzM6lOImwxVW8z';
const PROJECT_NAME = 'tarieven-app';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.vercel.com';

if (!TOKEN) { console.error('VERCEL_TOKEN ontbreekt'); process.exit(1); }

const IGNORE = new Set(['node_modules', '.next', '.vercel', '.git', '.DS_Store']);
const IGNORE_PATTERNS = [/\.env\.local$/, /\.env$/, /\.log$/];

async function* walk(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    if (IGNORE_PATTERNS.some(p => p.test(e.name))) continue;
    const full = path.join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) yield* walk(full, rel);
    else if (e.isFile()) yield { full, rel };
  }
}

async function api(p, opts = {}) {
  const url = `${API}${p}${p.includes('?') ? '&' : '?'}teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || 'GET'} ${p} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function uploadFile({ full, rel }) {
  const data = await fs.readFile(full);
  const sha = crypto.createHash('sha1').update(data).digest('hex');
  const url = `${API}/v2/files?teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/octet-stream',
      'x-vercel-digest': sha,
      'Content-Length': String(data.length),
    },
    body: data,
  });
  if (!res.ok && res.status !== 200) {
    const t = await res.text();
    throw new Error(`Upload ${rel} -> ${res.status}: ${t.slice(0, 200)}`);
  }
  return { file: rel, sha, size: data.length };
}

const POLL = process.env.POLL !== '0';

(async () => {
  console.log('Files inventariseren...');
  const files = [];
  for await (const f of walk(ROOT)) files.push(f);
  console.log(`  ${files.length} files`);

  console.log('Files uploaden (parallel, max 8)...');
  const fileMeta = [];
  const concurrency = 8;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(uploadFile));
    fileMeta.push(...results);
  }
  console.log(`  ${fileMeta.length} uploads OK`);

  console.log('Deployment aanmaken...');
  const dep = await api('/v13/deployments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: PROJECT_NAME,
      target: 'production',
      project: PROJECT_NAME,
      files: fileMeta.map(f => ({ file: f.file, sha: f.sha, size: f.size })),
      projectSettings: { framework: 'nextjs' },
    }),
  });
  console.log(`  ID: ${dep.id}`);
  console.log(`  URL: https://${dep.url}`);

  if (!POLL) {
    console.log('Polling overgeslagen (POLL=0). Check via Vercel dashboard.');
    process.exit(0);
  }

  console.log('Bouw afwachten...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const status = await api(`/v13/deployments/${dep.id}`);
      const state = status.readyState || status.status;
      console.log(`  [${i*3}s] state=${state}`);
      if (state === 'READY') { console.log('Deploy klaar! https://' + dep.url); process.exit(0); }
      if (state === 'ERROR' || state === 'CANCELED') { console.log('Deploy ' + state); process.exit(2); }
    } catch (e) { console.log('  poll error:', e.message); }
  }
  console.log('Polling timeout. Check status manueel.');
})();
