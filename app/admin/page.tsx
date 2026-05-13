'use client';

import { useState } from 'react';
import { Loader2, Play, ShieldAlert } from 'lucide-react';

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function trigger() {
    if (!secret) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch('/api/scrape', { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
      const json = await r.json();
      setResult({ status: r.status, ...json });
    } catch (e: any) {
      setResult({ error: e?.message ?? 'Onbekende fout' });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-600" /> Admin: tariefkaarten herfetchen
        </h2>
        <p className="text-xs text-slate-600 mb-4">
          Triggert handmatig de scrape-routine. Vereist <code className="text-xs bg-slate-100 px-1 rounded">CRON_SECRET</code> environment variabele.
          Cron draait automatisch elke 2de van de maand.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">CRON_SECRET</label>
            <input
              type="password"
              className="input"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button onClick={trigger} disabled={!secret || busy} className="btn btn-primary disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Play size={16} className="mr-1.5" />}
            Scrape nu
          </button>
        </div>
      </div>

      {result && (
        <div className="card">
          <h3 className="text-sm font-bold mb-2 text-slate-900">Resultaat</h3>
          <pre className="text-xs bg-slate-900 text-emerald-300 p-4 rounded-md overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-bold mb-2 text-slate-900">Hoe werken de scrapers?</h3>
        <ul className="text-xs text-slate-700 space-y-2 list-disc pl-5">
          <li><strong>Bolt</strong>: voorspelbare PDF-URL met versienummer (<code>bolt_res_el_nl_*.pdf</code>) — probeert recente versies tot er een werkt.</li>
          <li><strong>Mega</strong>: maandelijkse PDF op vast URL-patroon met YYYYMM. Faalt vaak als Mega de URL-pattern wijzigt.</li>
          <li><strong>OCTA+</strong>: vaste URL voor "actuele" tariefkaart — meest betrouwbare scrape.</li>
          <li><strong>Trevion + Frank Energie</strong>: jaar/maand-gebaseerde URL-patronen.</li>
          <li>Voor andere leveranciers (ENGIE, TotalEnergies, Eneco, Luminus, Ecopower, EBEM) wordt de vorige snapshot hergebruikt totdat je manueel updatet of een scraper toevoegt in <code>lib/scrapers/</code>.</li>
        </ul>
      </div>
    </div>
  );
}
