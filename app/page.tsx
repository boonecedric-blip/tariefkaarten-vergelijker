import Vergelijker from '@/components/Vergelijker';
import { listMaanden, loadMaand } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: { maand?: string } }) {
  const maanden = await listMaanden();
  const initialMaand = searchParams.maand && maanden.includes(searchParams.maand)
    ? searchParams.maand
    : maanden[0];
  const snapshot = await loadMaand(initialMaand);
  if (!snapshot) {
    return <div className="card text-center text-slate-600">Geen tariefkaart-data beschikbaar.</div>;
  }
  return <Vergelijker initialSnapshot={snapshot} beschikbareMaanden={maanden} />;
}
