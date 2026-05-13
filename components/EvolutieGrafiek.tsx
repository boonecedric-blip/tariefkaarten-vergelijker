'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import type { MaandSnapshot } from '@/lib/types';
import { lookupPostcode } from '@/lib/postcodes';
import { marginaleAfname, marginaleInjectie, fmtNum } from '@/lib/calculations';
import { maandLabel } from '@/lib/utils';

type Mode = 'afname' | 'injectie';

const COLORS = [
  '#1d4ed8', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#9333ea', '#ea580c', '#0d9488',
];

interface Props { snapshots: MaandSnapshot[]; }

export default function EvolutieGrafiek({ snapshots }: Props) {
  const [postcode, setPostcode] = useState('9000');
  const [epex, setEpex] = useState(100);
  const [mode, setMode] = useState<Mode>('afname');
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const sorted = [...snapshots].sort((a, b) => a.maand.localeCompare(b.maand));
  const pcInfo = lookupPostcode(postcode);

  const allSupplierIds = useMemo(() => {
    const set = new Set<string>();
    sorted.forEach(s => s.suppliers.forEach(sup => set.add(sup.id)));
    return Array.from(set);
  }, [sorted]);

  const supplierMeta = useMemo(() => {
    const map: Record<string, { id: string; naam: string }> = {};
    sorted.forEach(s => s.suppliers.forEach(sup => {
      if (!map[sup.id]) map[sup.id] = { id: sup.id, naam: sup.naam };
    }));
    return map;
  }, [sorted]);

  const data = useMemo(() => {
    return sorted.map(snap => {
      const dnb = pcInfo ? snap.dnbTarifs[pcInfo.dnb] ?? null : null;
      const inp = {
        epex, dnb,
        heffingen: snap.heffingen,
        incDistributie: true, incHeffingen: true, incBtw: true, incCertificaten: false,
      };
      const row: Record<string, any> = { maand: maandLabel(snap.maand) };
      snap.suppliers.forEach(sup => {
        const v = mode === 'afname' ? marginaleAfname(sup, inp) : marginaleInjectie(sup, inp);
        row[sup.id] = parseFloat(v.toFixed(3));
      });
      return row;
    });
  }, [sorted, pcInfo, epex, mode]);

  function toggle(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    setHidden(next);
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-base font-bold text-slate-900 mb-4">Evolutie per leverancier</h2>
        <p className="text-xs text-slate-500 mb-4">
          Hoe veranderen de tarieven over tijd bij eenzelfde EPEX-prijs? Pas postcode en EPEX-prijs aan om te zien hoe de spread tussen leveranciers per maand evolueert.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Postcode</label>
            <input className="input" value={postcode} onChange={e => setPostcode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
            <div className="text-xs text-slate-500 mt-1">{pcInfo ? `${pcInfo.gemeente} (${pcInfo.dnb})` : '—'}</div>
          </div>
          <div>
            <label className="label">EPEX-prijs (€/MWh)</label>
            <input type="number" className="input" value={epex} onChange={e => setEpex(parseFloat(e.target.value) || 0)} step="1" />
          </div>
          <div>
            <label className="label">Modus</label>
            <div className="inline-flex rounded-md border border-slate-300 p-0.5">
              <button onClick={() => setMode('afname')} className={`px-3 py-1.5 text-sm rounded ${mode === 'afname' ? 'bg-hv-green text-white' : 'text-slate-700'}`}>Afname</button>
              <button onClick={() => setMode('injectie')} className={`px-3 py-1.5 text-sm rounded ${mode === 'injectie' ? 'bg-hv-green text-white' : 'text-slate-700'}`}>Injectie</button>
            </div>
          </div>
        </div>

        <div className="h-96 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="maand" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} unit=" c€/kWh" width={80} />
              <Tooltip
                formatter={(val: any) => fmtNum(val as number, 2) + ' c€/kWh'}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend onClick={(o: any) => toggle(o.dataKey)} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              {allSupplierIds.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={supplierMeta[id]?.naam ?? id}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={hidden.has(id)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-slate-500 mt-3">
          {mode === 'afname'
            ? 'Marginale afname-prijs incl. distributie + heffingen + 6% BTW.'
            : 'Marginale injectievergoeding (excl. BTW — particulier zonder BTW-statuut).'}
          Klik op een leverancier in de legende om hem te verbergen.
        </div>
      </div>
    </div>
  );
}
