'use client';
import { maandLabel } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  maanden: string[];
  geselecteerd: string;
  onChange: (m: string) => void;
  variant?: 'light' | 'dark';
}

export default function MaandSelector({ maanden, geselecteerd, onChange, variant = 'light' }: Props) {
  if (!maanden.length) return null;
  const idx = maanden.indexOf(geselecteerd);
  const prev = idx >= 0 && idx + 1 < maanden.length ? maanden[idx + 1] : null;
  const next = idx > 0 ? maanden[idx - 1] : null;

  const dark = variant === 'dark';
  const wrap = dark
    ? 'flex items-center gap-1 bg-white/10 rounded-lg p-1'
    : 'flex items-center gap-2 bg-slate-100 rounded-lg p-1';
  const btn = dark
    ? 'p-1.5 rounded-md hover:bg-white/15 text-white disabled:opacity-30 disabled:cursor-not-allowed'
    : 'p-1.5 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed';
  const sel = dark
    ? 'bg-transparent font-display font-bold text-white text-sm px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-hv-yellow rounded'
    : 'bg-transparent font-semibold text-slate-800 px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-hv-green rounded';

  return (
    <div className={wrap}>
      <button
        onClick={() => prev && onChange(prev)}
        disabled={!prev}
        className={btn}
        aria-label="Vorige maand"
      >
        <ChevronLeft size={18} />
      </button>
      <select
        value={geselecteerd}
        onChange={e => onChange(e.target.value)}
        className={sel}
      >
        {maanden.map(m => (
          <option key={m} value={m} className="text-slate-900">{maandLabel(m)}</option>
        ))}
      </select>
      <button
        onClick={() => next && onChange(next)}
        disabled={!next}
        className={btn}
        aria-label="Volgende maand"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
