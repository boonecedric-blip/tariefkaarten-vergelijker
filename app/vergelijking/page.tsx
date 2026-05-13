import MaandVergelijking from '@/components/MaandVergelijking';
import { listMaanden } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const maanden = await listMaanden();
  if (maanden.length < 2) {
    return <div className="card text-slate-600">Minstens 2 maanden nodig om te vergelijken.</div>;
  }
  return <MaandVergelijking beschikbareMaanden={maanden} />;
}
