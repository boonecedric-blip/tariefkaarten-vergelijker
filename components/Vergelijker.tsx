'use client';

import { useEffect, useMemo, useState } from 'react';
import { lookupPostcode } from '@/lib/postcodes';
import {
  marginaleAfname,
  marginaleInjectie,
  jaarBerekening,
  fmtNum,
  fmtEur,
  type BerekeningInputs,
  type JaarInputs,
} from '@/lib/calculations';
import type { MaandSnapshot, SupplierFormula } from '@/lib/types';
import { ExternalLink, Info, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';
import MaandSelector from './MaandSelector';
import { maandLabel } from '@/lib/utils';

interface Props {
  initialSnapshot: MaandSnapshot;
  beschikbareMaanden: string[];
}

const QUICK_PRICES = [
  { label: '−50', value: -50, hint: 'negatief: zonnige middag' },
  { label: '20', value: 20, hint: 'laag' },
  { label: '60', value: 60, hint: 'gemiddeld' },
  { label: '100', value: 100, hint: 'typisch maandgemiddelde' },
  { label: '200', value: 200, hint: 'hoog: avondpiek' },
  { label: '500', value: 500, hint: 'extreem' },
];

type SortKey = 'naam' | 'afname' | 'injectie' | 'vast' | 'jaar';

function initials(naam: string): string {
  const parts = naam.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Vergelijker({ initialSnapshot, beschikbareMaanden }: Props) {
  const [snapshot, setSnapshot] = useState<MaandSnapshot>(initialSnapshot);
  const [maand, setMaand] = useState<string>(initialSnapshot.maand);
  const [postcode, setPostcode] = useState('9000');
  const [epex, setEpex] = useState(100);
  const [verbruik, setVerbruik] = useState(3500);
  const [injectie, setInjectie] = useState(2000);
  const [piek, setPiek] = useState(4.24);
  const [incDistributie, setIncDistributie] = useState(true);
  const [incHeffingen, setIncHeffingen] = useState(true);
  const [incBtw, setIncBtw] = useState(true);
  const [incCertif, setIncCertif] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('jaar');
  const [sortAsc, setSortAsc] = useState(true);

  // Load snapshot when maand changes
  useEffect(() => {
    if (maand === snapshot.maand) return;
    fetch(`/api/tariefkaart/${maand}`)
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s) setSnapshot(s); })
      .catch(() => {});
  }, [maand, snapshot.maand]);

  const pcInfo = useMemo(() => lookupPostcode(postcode), [postcode]);
  const dnb = pcInfo ? snapshot.dnbTarifs[pcInfo.dnb] ?? null : null;

  const inp: BerekeningInputs = {
    epex, dnb, heffingen: snapshot.heffingen,
    incDistributie, incHeffingen, incBtw, incCertificaten: incCertif,
  };

  const rows = useMemo(() => {
    const ji: JaarInputs | null = dnb ? {
      dnb, heffingen: snapshot.heffingen,
      belpexAfname: snapshot.schattingen.belpexJaarAfname,
      belpexInjectie: snapshot.schattingen.belpexJaarInjectie,
      jaarVerbruik: verbruik, jaarInjectie: injectie,
      maandPiekKW: piek, incCertificaten: incCertif,
    } : null;
    const r = snapshot.suppliers.map(sup => ({
      sup,
      afname: marginaleAfname(sup, inp),
      injectie: marginaleInjectie(sup, inp),
      vast: sup.vasteJaarExclBTW * (incBtw ? 1 + snapshot.heffingen.btw / 100 : 1),
      jaar: ji ? jaarBerekening(sup, ji).netto : NaN,
    }));
    const cmp = (a: typeof r[number], b: typeof r[number]) => {
      const av = sortKey === 'naam' ? a.sup.naam : a[sortKey];
      const bv = sortKey === 'naam' ? b.sup.naam : b[sortKey];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      const an = av as number, bn = bv as number;
      if (!isFinite(an) && !isFinite(bn)) return 0;
      if (!isFinite(an)) return 1;
      if (!isFinite(bn)) return -1;
      return sortAsc ? an - bn : bn - an;
    };
    return r.sort(cmp);
  }, [snapshot, inp, incBtw, sortKey, sortAsc, dnb, verbruik, injectie, piek, incCertif]);

  const minAfname = Math.min(...rows.map(r => r.afname));
  const maxAfname = Math.max(...rows.map(r => r.afname));
  const maxInj = Math.max(...rows.map(r => r.injectie));
  const minInj = Math.min(...rows.map(r => r.injectie));

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(k !== 'injectie'); }
  }

  // Jaar simulatie (sorted op netto)
  const jaarRows = useMemo(() => {
    if (!dnb) return [];
    const ji: JaarInputs = {
      dnb, heffingen: snapshot.heffingen,
      belpexAfname: snapshot.schattingen.belpexJaarAfname,
      belpexInjectie: snapshot.schattingen.belpexJaarInjectie,
      jaarVerbruik: verbruik, jaarInjectie: injectie,
      maandPiekKW: piek, incCertificaten: incCertif,
    };
    return snapshot.suppliers.map(sup => ({ sup, j: jaarBerekening(sup, ji) }))
      .sort((a, b) => a.j.netto - b.j.netto);
  }, [snapshot, dnb, verbruik, injectie, piek, incCertif]);

  const beste = jaarRows[0];
  const slechtste = jaarRows[jaarRows.length - 1];
  const top3 = jaarRows.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* ============ 1. PAS AAN ============ */}
      <section>
        <div className="step-pill mb-1.5"><span className="n">1</span> Pas aan</div>
        <h1 className="font-display font-bold text-2xl sm:text-[28px] tracking-tight text-hv-dark leading-tight mb-1">
          Vul jouw situatie in
        </h1>
        <p className="text-sm text-hv-mute max-w-2xl mb-5">
          Postcode bepaalt je netbeheerder en distributietarief. Verbruik en injectie bepalen je jaarkost.
          Alle bedragen zijn netto incl. BTW &amp; alle componenten.
        </p>

        <div className="bg-hv-blue text-white rounded-xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-hv-yellow font-display font-bold">Tariefkaart</div>
              <div className="font-display font-bold text-xl mt-0.5">{maandLabel(snapshot.maand)}</div>
              <div className="text-[11px] text-white/55 mt-0.5">
                Snapshot {new Date(snapshot.scrapeDatum).toLocaleDateString('nl-BE')} · {snapshot.suppliers.length} leveranciers
              </div>
            </div>
            <MaandSelector maanden={beschikbareMaanden} geselecteerd={maand} onChange={setMaand} variant="dark" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="label-dark">Postcode</label>
              <input
                className="input-dark"
                value={postcode}
                onChange={e => setPostcode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="bv 9000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label-dark">Verbruik (kWh/j)</label>
              <input
                type="number" step="100" min="0"
                className="input-dark"
                value={verbruik}
                onChange={e => setVerbruik(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label-dark">Injectie (kWh/j)</label>
              <input
                type="number" step="100" min="0"
                className="input-dark"
                value={injectie}
                onChange={e => setInjectie(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label-dark">Maandpiek (kW)</label>
              <input
                type="number" step="0.1" min="2.5"
                className="input-dark"
                value={piek}
                onChange={e => setPiek(parseFloat(e.target.value) || 2.5)}
              />
            </div>
            <div>
              <label className="label-dark">Accijns (c€/kWh)</label>
              <input
                type="number"
                className="input-dark"
                value={snapshot.heffingen.bijzondereAccijns}
                disabled
                title="Komt uit de tariefkaart-snapshot"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {pcInfo && dnb ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-hv-green/25 border-l-[3px] border-hv-green rounded-md text-white/95">
                <CheckCircle2 size={16} className="text-hv-green flex-shrink-0" />
                <span><strong className="text-white">{pcInfo.gemeente}</strong> · netbeheerder: <strong className="text-white">{dnb.naam}</strong> ({pcInfo.dnb}) — distributie + capaciteit worden meegerekend</span>
              </div>
            ) : postcode.length === 4 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-hv-warn/25 border-l-[3px] border-hv-warn rounded-md text-white/95">
                <AlertTriangle size={16} className="text-hv-yellow flex-shrink-0" />
                <span className="text-white">Postcode niet gevonden — distributietarieven worden niet meegerekend.</span>
              </div>
            ) : (
              <span className="text-white/50 text-xs">Voer een 4-cijferige Vlaamse postcode in.</span>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-hv-yellow/20 border-l-[3px] border-hv-yellow rounded-md">
          <p className="text-sm text-hv-blue leading-relaxed">
            <strong>Let op:</strong> Deze cijfers geven geen exacte weerspiegeling van jouw factuur. Met een dynamisch tarief zal jouw factuur er volledig anders uitzien wanneer je een <strong>slim gestuurde thuisbatterij</strong> hebt. Deze tool is enkel nuttig <strong>puur voor het vergelijk van de leveranciers</strong>.
            {' '}<a href="https://hivolta.be?utm_source=tarievenapp&utm_medium=disclaimer&utm_campaign=batterij" target="_blank" rel="noopener" className="text-hv-green-dk underline font-semibold hover:text-hv-dark">Bereken je werkelijke factuur met batterij op hivolta.be →</a>
          </p>
        </div>
      </section>

      {/* ============ STICKY EPEX BAR ============ */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-hv-cream/90 backdrop-blur border-y border-hv-line">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-2 font-display font-medium text-hv-dark">
            <span className="bg-hv-green text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">EPEX</span>
            <span>Marginale prijs bij</span>
          </div>
          <div className="flex-1 min-w-[220px] flex items-center gap-3">
            <input
              type="range"
              min={-100}
              max={500}
              step={1}
              value={epex}
              onChange={e => setEpex(parseFloat(e.target.value))}
              className="flex-1 accent-hv-green"
            />
            <div className="font-display font-bold text-hv-dark min-w-[110px] text-right tabular">
              {epex} €/MWh
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_PRICES.map(q => (
              <button
                key={q.value}
                onClick={() => setEpex(q.value)}
                title={q.hint}
                className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                  epex === q.value
                    ? 'bg-hv-dark text-white border-hv-dark'
                    : 'bg-white text-hv-blue border-hv-line-strong hover:border-hv-dark'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-xs text-hv-mute flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={incDistributie} onChange={e => setIncDistributie(e.target.checked)} className="accent-hv-green" /> Distributie</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={incHeffingen} onChange={e => setIncHeffingen(e.target.checked)} className="accent-hv-green" /> Heffingen</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={incBtw} onChange={e => setIncBtw(e.target.checked)} className="accent-hv-green" /> BTW</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={incCertif} onChange={e => setIncCertif(e.target.checked)} className="accent-hv-green" /> Certif.</label>
          </div>
        </div>
        <div className="mt-1 text-[11px] text-hv-mute">≈ {fmtNum(epex / 10, 2)} c€/kWh — slider blijft vastgepind terwijl je scrollt</div>
      </div>

      {/* ============ 2. RANKING ============ */}
      <section>
        <div className="step-pill mb-1.5"><span className="n">2</span> Ranking</div>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
          <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-hv-dark leading-tight">
            Alle leveranciers gesorteerd
          </h2>
          <div className="text-xs text-hv-mute max-w-md">
            Klik een kolom om te sorteren. Goedkoopste afname en injectie zijn groen, duurste in rood. Netto €/jaar staat rechts in geel.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-hv-line shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-3 bg-[#FAFAF6] border-b border-hv-line flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-hv-dark">
              Volledige ranking · marginaal &amp; jaarkost
            </h3>
            <span className="text-[11px] text-hv-mute">Sortering: {sortKey === 'jaar' ? 'Netto €/jaar' : sortKey} {sortAsc ? '↑' : '↓'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-hv-blue text-white">
                <tr>
                  <th className="text-left px-5 sm:px-6 py-3 font-display font-medium text-[11px] uppercase tracking-wider cursor-pointer w-10">#</th>
                  <th className="text-left px-3 py-3 font-display font-medium text-[11px] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('naam')}>
                    Leverancier {sortKey === 'naam' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="text-right px-3 py-3 font-display font-medium text-[11px] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('afname')}>
                    Afname<br/><span className="text-[10px] text-white/55 font-normal normal-case tracking-normal">c€/kWh @ EPEX {epex}</span> {sortKey === 'afname' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="text-right px-3 py-3 font-display font-medium text-[11px] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('injectie')}>
                    Injectie<br/><span className="text-[10px] text-white/55 font-normal normal-case tracking-normal">c€/kWh</span> {sortKey === 'injectie' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="text-right px-3 py-3 font-display font-medium text-[11px] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('vast')}>
                    Vast<br/><span className="text-[10px] text-white/55 font-normal normal-case tracking-normal">€/jaar</span> {sortKey === 'vast' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="text-right px-4 py-3 font-display font-medium text-[11px] uppercase tracking-wider cursor-pointer bg-hv-blue-dk" onClick={() => toggleSort('jaar')}>
                    Netto €/jaar {sortKey === 'jaar' && (sortAsc ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isBestAfn = r.afname === minAfname;
                  const isWorstAfn = r.afname === maxAfname;
                  const isBestInj = r.injectie === maxInj;
                  const isWorstInj = r.injectie === minInj;
                  const isWinner = beste && r.sup.id === beste.sup.id;
                  return (
                    <tr key={r.sup.id} className={`border-t border-hv-line ${isWinner ? 'bg-emerald-50/60' : 'odd:bg-white even:bg-[#FAFAF6] hover:bg-emerald-50/40'}`}>
                      <td className="px-5 sm:px-6 py-3 text-hv-mute tabular text-right">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-hv-dark text-white flex items-center justify-center font-display font-bold text-[12px] tracking-tight flex-shrink-0">
                            {initials(r.sup.naam)}
                          </div>
                          <div className="leading-tight">
                            <div className="font-display font-bold text-hv-dark text-[14px] flex items-center gap-1.5 flex-wrap">
                              {r.sup.naam}
                              <span className={`badge ${r.sup.indexering === '15' ? 'badge-q' : 'badge-h'}`}>
                                {r.sup.indexering === '15' ? "15'" : 'u'}
                              </span>
                              {r.sup.schatting && (
                                <span className="badge badge-warn" title={r.sup.opmerking}>schatting</span>
                              )}
                            </div>
                            <div className="text-[11px] text-hv-mute">{r.sup.product}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`text-right px-3 py-3 tabular ${isBestAfn ? 'bg-emerald-50 font-bold text-emerald-800' : isWorstAfn ? 'text-rose-700' : 'text-hv-blue'}`}>
                        {fmtNum(r.afname, 2)}
                      </td>
                      <td className={`text-right px-3 py-3 tabular ${isBestInj ? 'bg-emerald-50 font-bold text-emerald-800' : isWorstInj ? 'text-rose-700' : 'text-hv-blue'}`}>
                        {fmtNum(r.injectie, 2)}
                      </td>
                      <td className="text-right px-3 py-3 tabular text-hv-blue">{fmtEur(r.vast, 0)}</td>
                      <td className={`text-right px-4 py-3 tabular font-bold ${isWinner ? 'bg-hv-green/20 text-hv-green-dk' : 'bg-hv-yellow/20 text-hv-blue'}`}>
                        {isFinite(r.jaar) ? fmtEur(r.jaar, 0) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ 3. DE BESTE ============ */}
      {dnb && beste && (
        <section>
          <div className="step-pill mb-1.5"><span className="n">3</span> De beste</div>
          <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-hv-dark leading-tight">
              Goedkoopste voor jouw situatie
            </h2>
            <div className="text-xs text-hv-mute max-w-md">
              Op basis van geschatte jaargemiddelde EPEX-prijzen voor {maandLabel(snapshot.maand)}, incl. distributie, capaciteit, heffingen en BTW.
            </div>
          </div>

          <div className="bg-white border border-hv-line rounded-2xl p-6 sm:p-9 relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-hv-green" />
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-display font-bold text-hv-green-dk">
                  <Trophy size={14} /> #1 in de ranking
                </div>
                <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-hv-dark leading-[1.05] mt-2">
                  {beste.sup.naam}
                </h3>
                <div className="text-hv-mute text-sm mt-1">
                  {beste.sup.product} · {beste.sup.indexering === '15' ? '15-minuten' : 'uurlijkse'} indexering
                </div>
                <div className="flex items-baseline gap-3 mt-5">
                  <span className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-hv-dark leading-none tabular">
                    {fmtEur(beste.j.netto, 0)}
                  </span>
                  <span className="text-sm text-hv-mute font-medium">/ jaar netto, incl. BTW</span>
                </div>
                {slechtste && slechtste !== beste && (
                  <div className="inline-flex items-center gap-2 bg-hv-yellow text-hv-blue px-3.5 py-1.5 rounded-full font-display font-bold text-sm mt-4">
                    <span className="w-2 h-2 rounded-full bg-hv-blue" />
                    Bespaar {fmtEur(slechtste.j.netto - beste.j.netto, 0)}/jaar vs. duurste
                  </div>
                )}
              </div>

              <div className="bg-[#F4F6F2] rounded-xl p-5 text-sm">
                <h4 className="font-display font-bold uppercase tracking-[0.1em] text-[11px] text-hv-mute mb-2">Kostenopbouw</h4>
                <div className="space-y-1.5">
                  <BreakdownLine label="Energie afname" value={fmtEur(beste.j.energieAfname, 0)} />
                  <BreakdownLine label="Distributie + capaciteit" value={fmtEur(beste.j.distributie + beste.j.capaciteit + beste.j.databeheer, 0)} />
                  <BreakdownLine label="Heffingen + accijns" value={fmtEur(beste.j.heffingen + beste.j.certificaten, 0)} />
                  <BreakdownLine label="Vaste vergoeding" value={fmtEur(beste.j.vasteLev, 0)} />
                  <BreakdownLine label="BTW (6%)" value={fmtEur(beste.j.btwBedrag, 0)} />
                  <BreakdownLine label="− Injectie-inkomsten" value={`−${fmtEur(beste.j.injectieInkomsten, 0)}`} tone="positive" />
                  <div className="border-t border-hv-line-strong pt-2 mt-2 flex justify-between font-display font-bold text-hv-dark text-base">
                    <span>Netto/jaar</span><span>{fmtEur(beste.j.netto, 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ 4. TOP 3 ============ */}
      {dnb && top3.length > 0 && (
        <section>
          <div className="step-pill mb-1.5"><span className="n">4</span> Top 3</div>
          <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-hv-dark leading-tight">
              Podium
            </h2>
            <div className="text-xs text-hv-mute max-w-md">
              De drie scherpste leveranciers — handig wanneer je twijfelt tussen twee opties.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((r, i) => {
              const isFirst = i === 0;
              const delta = i === 0 ? 0 : r.j.netto - top3[0].j.netto;
              return (
                <div key={r.sup.id} className={`relative bg-white border rounded-xl p-5 ${isFirst ? 'border-hv-green ring-1 ring-hv-green' : 'border-hv-line'}`}>
                  <div className={`absolute top-3 right-4 font-display font-bold text-2xl tracking-tight ${isFirst ? 'text-hv-green' : 'text-hv-line-strong'}`}>
                    {i + 1}
                  </div>
                  <div className="font-display font-bold text-hv-dark text-base tracking-tight">{r.sup.naam}</div>
                  <div className="text-xs text-hv-mute mt-0.5">{r.sup.product} · {r.sup.indexering === '15' ? "15'" : 'u'}</div>
                  <div className="font-display font-bold text-hv-dark text-2xl tracking-tight mt-3 tabular">
                    {fmtEur(r.j.netto, 0)}<span className="text-sm text-hv-mute font-normal">/jaar</span>
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isFirst ? 'text-hv-dark' : 'text-hv-green-dk'}`}>
                    {isFirst ? 'Goedkoopste · 0 €' : `+${fmtEur(delta, 0)} / jaar`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ CTA bridge ============ */}
      {dnb && beste && (
        <div className="bg-hv-dark text-white rounded-2xl p-6 sm:p-7 flex items-center gap-5 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-hv-yellow text-hv-blue flex items-center justify-center font-display font-bold text-2xl flex-shrink-0">☀</div>
          <div className="flex-1 min-w-[260px]">
            <h3 className="font-display font-bold text-lg sm:text-xl tracking-tight">Wil je je werkelijke terugverdientijd weten?</h3>
            <p className="text-sm text-white/75 mt-1 leading-relaxed">
              Deze tool vergelijkt enkel leveranciers. Voor een complete simulatie met zonnepanelen, thuisbatterij en laadpaal op basis van jouw werkelijk verbruiksprofiel — bekijk de Hivolta-calculator.
            </p>
          </div>
          <a href="https://hivolta.be?utm_source=tarievenapp&utm_medium=inpage&utm_campaign=jaarsim"
             target="_blank" rel="noopener"
             className="bg-hv-yellow text-hv-blue px-5 py-3 rounded-md text-sm font-bold hover:brightness-95 whitespace-nowrap font-display">
            Bereken op hivolta.be →
          </a>
        </div>
      )}

      {/* ============ Formules per leverancier ============ */}
      <section>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
          <h2 className="font-display font-bold text-xl tracking-tight text-hv-dark">
            Formule per leverancier
          </h2>
        </div>
        <div className="bg-white border border-hv-line rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="space-y-1">
            {snapshot.suppliers.map(sup => (
              <SupplierDetail key={sup.id} sup={sup} maand={snapshot.maand} />
            ))}
          </div>
          {snapshot.changelog && snapshot.changelog.length > 0 && (
            <div className="mt-5 pt-4 border-t border-hv-line">
              <h3 className="text-sm font-display font-bold text-hv-dark mb-2 flex items-center gap-1.5">
                <Info size={14} /> Wijzigingen sinds vorige maand
              </h3>
              <ul className="text-xs text-hv-blue/80 space-y-1 list-disc pl-5">
                {snapshot.changelog.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ============ Jaar simulatie detail (compact, opvouwbaar) ============ */}
      {dnb && jaarRows.length > 0 && (
        <details className="bg-white border border-hv-line rounded-xl p-5 shadow-sm">
          <summary className="cursor-pointer font-display font-bold text-hv-dark text-base">
            Volledige jaaropbouw per leverancier (alle componenten)
          </summary>
          <div className="overflow-x-auto -mx-5 mt-4">
            <table className="w-full text-xs">
              <thead className="bg-hv-blue text-white uppercase">
                <tr>
                  <th className="text-left px-5 py-2 font-display font-medium tracking-wider">#</th>
                  <th className="text-left px-2 py-2 font-display font-medium tracking-wider">Leverancier</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider">Energie afn</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider">Distrib + cap</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider">Heffingen</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider">Vaste lev.</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider">BTW</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider text-hv-yellow">−Injectie</th>
                  <th className="text-right px-2 py-2 font-display font-medium tracking-wider">Netto/jaar</th>
                </tr>
              </thead>
              <tbody>
                {jaarRows.map((r, i) => (
                  <tr key={r.sup.id} className="border-t border-hv-line odd:bg-white even:bg-[#FAFAF6]">
                    <td className="px-5 py-2 text-hv-mute">{i + 1}</td>
                    <td className="px-2 py-2 font-display font-bold text-hv-dark">{r.sup.naam}</td>
                    <td className="px-2 py-2 text-right tabular text-hv-blue">{fmtEur(r.j.energieAfname, 0)}</td>
                    <td className="px-2 py-2 text-right tabular text-hv-blue">{fmtEur(r.j.distributie + r.j.capaciteit + r.j.databeheer, 0)}</td>
                    <td className="px-2 py-2 text-right tabular text-hv-blue">{fmtEur(r.j.heffingen + r.j.certificaten, 0)}</td>
                    <td className="px-2 py-2 text-right tabular text-hv-blue">{fmtEur(r.j.vasteLev, 0)}</td>
                    <td className="px-2 py-2 text-right tabular text-hv-blue">{fmtEur(r.j.btwBedrag, 0)}</td>
                    <td className="px-2 py-2 text-right tabular text-hv-green-dk">−{fmtEur(r.j.injectieInkomsten, 0)}</td>
                    <td className="px-2 py-2 text-right tabular font-bold text-hv-dark">{fmtEur(r.j.netto, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function BreakdownLine({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-hv-mute">{label}</span>
      <span className={`font-display font-bold tabular ${tone === 'positive' ? 'text-hv-green-dk' : 'text-hv-dark'}`}>{value}</span>
    </div>
  );
}

function SupplierDetail({ sup, maand }: { sup: SupplierFormula; maand: string }) {
  return (
    <details className="group rounded-lg border border-hv-line hover:border-hv-green/40 transition">
      <summary className="cursor-pointer px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-hv-dark text-white flex items-center justify-center font-display font-bold text-[11px] tracking-tight flex-shrink-0">
            {initials(sup.naam)}
          </div>
          <span className="font-display font-bold text-hv-dark">{sup.naam}</span>
          <span className="text-xs text-hv-mute">{sup.product}</span>
          <span className={`badge ${sup.indexering === '15' ? 'badge-q' : 'badge-h'}`}>
            {sup.indexering === '15' ? "15'" : 'u'}
          </span>
          {sup.schatting && <span className="badge badge-warn">schatting</span>}
        </div>
        <span className="text-xs text-hv-mute group-open:rotate-90 transition">▶</span>
      </summary>
      <div className="px-4 pb-4 space-y-2 text-xs">
        <div className="bg-[#F7F6F1] rounded-md p-3 space-y-1.5">
          <div><span className="text-hv-mute font-semibold">Afname:</span> <code className="bg-white px-1.5 py-0.5 rounded border border-hv-line font-mono">{sup.formuleAfname}</code></div>
          <div><span className="text-hv-mute font-semibold">Injectie:</span> <code className="bg-white px-1.5 py-0.5 rounded border border-hv-line font-mono">{sup.formuleInjectie}</code></div>
          <div><span className="text-hv-mute font-semibold">Vaste vergoeding:</span> {fmtEur(sup.vasteJaarExclBTW * 1.06, 2)}/jaar incl. 6% BTW (excl. {fmtEur(sup.vasteJaarExclBTW, 2)})</div>
          {sup.opmerking && (
            <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              <strong>Let op:</strong> {sup.opmerking}
            </div>
          )}
        </div>
        <a href={sup.bronUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-hv-dark hover:underline">
          Bron: {sup.bronNaam} <ExternalLink size={12} />
        </a>
      </div>
    </details>
  );
}
