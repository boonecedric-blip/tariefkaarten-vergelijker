import { NextResponse } from 'next/server';
import { loadMaand } from '@/lib/data';

export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: { maand: string } }) {
  const data = await loadMaand(params.maand);
  if (!data) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  return NextResponse.json(data);
}
