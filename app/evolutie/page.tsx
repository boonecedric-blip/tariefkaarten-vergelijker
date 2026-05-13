import EvolutieGrafiek from '@/components/EvolutieGrafiek';
import { listMaanden, loadMaanden } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const maanden = await listMaanden();
  const snapshots = await loadMaanden(maanden);
  if (snapshots.length === 0) {
    return <div className="card text-slate-600">Geen data beschikbaar.</div>;
  }
  return <EvolutieGrafiek snapshots={snapshots} />;
}
