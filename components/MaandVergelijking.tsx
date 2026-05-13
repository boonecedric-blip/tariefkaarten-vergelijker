'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MaandSnapshot } from '@/lib/types';
import { fmtNum, fmtPct, fmtEur } from '@/lib/calculations';
import { maandLabel } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props { beschikbareMaanden: string[]; }

export default function MaandVergelijking({ beschikbareMaanden }: Props) {
  const def1 = beschikbareMaanden[1] ?? beschikbareMaanden[0];
  const def2 = beschikbareMaanden[0];
  const [m1, setM1] = useState(def1);
  const [m2, setM2] = useState(def2);
  const [s1, setS1] = useState<MaandSnapshot | null>(null);
  const [s2, setS2] = useState<MaandSnapshot | null>(null);

  useEffect(() => {
    fetch(`/api/tariefkaart/${m1}`).then(r => r.ok ? r.json() : null).then(setS1);
  }, [m1]);
  useEffect(() => {
    fetch(`/api/tariefkaart/${m2}`).then(r => r.ok ? r.json() : null).then(setS2);
  }, [m2]);

  const rows = useMemo(() => {
    if (!s1 || !s2) return [];
    const ids = Array.from(new Set([...s1.suppliers.map(x => x.id), ...s2.suppliers.map(x => x.id)]));
    return ids.map(id => {
      const a = s1.suppliers.find(x => x.id === id) ?? null;
      const b = s2.suppliers.find(x => x.id === id) ?? null;
      const ref = b ?? a!;
      const offsetDelta = a && b ? b.afnameOffset - a.afnameOffset : null;
      const offsetPct = a && b && a.afnameOffset !== 0 ? ((b.afnameOffset - a.afnameOffset) / a.afnameOffset) * 100 : null;
      const multDelta = a && b ? b.afnameMult - a.afnameMult : null;
      const injOffsetDelta = a && b ? b.injOffset - a.injOffset : null;
      const vasteDelta = a && b ? b.vasteJaarExclBTW - a.vasteJaarExclBTW : null;
      return { id, naam: ref.naam, product: ref.product, a, b, offsetDelta, offsetPct, multDelta, injOffsetDelta, vasteDelta };
    });
  }, [s1, s2]);

  if (!s1 || !s2) {
    return <div className="card text-slate-500">Snapshots laden...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-base font-bold text-slate-900 mb-4">Vergelijk twee maanden</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Maand A (referentie)</label>
            <select className="input" value={m1} onChange={e => setM1(e.target.value)}>
              {beschikbareMaanden.map(m => <option key={m} value={m}>{maandLabel(m)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Maand B (vergelijking)</label>
            <select className="input" value={m2} onChange={e => setM2(e.target.value)}>
              {beschikbareMaanden.map(m => <option key={m} value={m}>{maandLabel(m)}</option>)}
            </select>
          </div>
        </div>

        {s2.changelog && s2.changelog.length > 0 && m1 !== m2 && (
          <div className="mt-4 p-3 bg-hv-cream border border-hv-green/30 rounded-md">
            <div className="text-xs font-semibold text-hv-dark mb-1">Changelog van {maandLabel(s2.maand)}</div>
            <ul className="text-xs text-hv-dark list-disc pl-5 space-y-0.5">
              {s2.changelog.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Afname-formule: vaste opslag (offset, EUR/MWh)
        </h3>
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700">
              <tr>
                <th className="text-left px-5 sm:px-6 py-2">Leverancier</th>
                <th className="text-right px-3 py-2">{maandLabel(m1)}</th>
                <th className="text-right px-3 py-2">{maandLabel(m2)}</th>
                <th className="text-right px-3 py-2">Δ EUR/MWh</th>
                <th className="text-right px-3 py-2">Δ %</th>
                <th className="text-right px-3 py-2">Vaste €/jaar Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 sm:px-6 py-2.5">
                    <div className="font-semibold text-slate-900">{r.naam}</div>
                    <div className="text-xs text-slate-500">{r.product}</div>
                  </td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{r.a ? fmtNum(r.a.afnameOffset, 2) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{r.b ? fmtNum(r.b.afnameOffset, 2) : <span className="text-slate-400">—</span>}</td>
                  <td className={`text-right px-3 py-2.5 tabular-nums font-semibold ${r.offsetDelta == null ? '' : r.offsetDelta > 0.001 ? 'text-rose-700' : r.offsetDelta < -0.001 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <span className="inline-flex items-center gap-1">
                      {r.offsetDelta == null ? '—' :
                        r.offsetDelta > 0.001 ? <TrendingUp size={12} /> :
                        r.offsetDelta < -0.001 ? <TrendingDown size={12} /> :
                        <Minus size={12} />}
                      {r.offsetDelta == null ? '' : (r.offsetDelta > 0 ? '+' : '') + fmtNum(r.offsetDelta, 2)}
                    </span>
                  </td>
                  <td className={`text-right px-3 py-2.5 tabular-nums text-xs ${r.offsetPct == null ? '' : r.offsetPct > 0.05 ? 'text-rose-700' : r.offsetPct < -0.05 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {r.offsetPct == null ? '—' : fmtPct(r.offsetPct, 1)}
                  </td>
                  <td className={`text-right px-3 py-2.5 tabular-nums ${r.vasteDelta == null ? '' : r.vasteDelta > 0.5 ? 'text-rose-700' : r.vasteDelta < -0.5 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {r.vasteDelta == null ? '—' : (r.vasteDelta > 0 ? '+' : '') + fmtEur(r.vasteDelta, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Negatieve Δ = goedkoper geworden (groen). Positieve Δ = duurder geworden (rood).
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Injectie-formule: vaste aftrek (offset, EUR/MWh)
        </h3>
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700">
              <tr>
                <th className="text-left px-5 sm:px-6 py-2">Leverancier</th>
                <th className="text-right px-3 py-2">{maandLabel(m1)}</th>
                <th className="text-right px-3 py-2">{maandLabel(m2)}</th>
                <th className="text-right px-3 py-2">Δ EUR/MWh</th>
                <th className="text-right px-3 py-2">Mult. {maandLabel(m1)}</th>
                <th className="text-right px-3 py-2">Mult. {maandLabel(m2)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 sm:px-6 py-2.5"><div className="font-semibold text-slate-900">{r.naam}</div></td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{r.a ? fmtNum(r.a.injOffset, 2) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{r.b ? fmtNum(r.b.injOffset, 2) : <span className="text-slate-400">—</span>}</td>
                  <td className={`text-right px-3 py-2.5 tabular-nums font-semibold ${r.injOffsetDelta == null ? '' : r.injOffsetDelta > 0.001 ? 'text-emerald-700' : r.injOffsetDelta < -0.001 ? 'text-rose-700' : 'text-slate-500'}`}>
                    {r.injOffsetDelta == null ? '—' : (r.injOffsetDelta > 0 ? '+' : '') + fmtNum(r.injOffsetDelta, 2)}
                  </td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-xs">{r.a ? fmtNum(r.a.injMult, 3) : '—'}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-xs">{r.b ? fmtNum(r.b.injMult, 3) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Voor injectie: positieve Δ (offset minder negatief) = je krijgt méér terug (groen).
        </p>
      </div>
    </div>
  );
}
