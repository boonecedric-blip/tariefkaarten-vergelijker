import { NextResponse } from 'next/server';
import { listMaanden } from '@/lib/data';

export const revalidate = 300;

export async function GET() {
  const maanden = await listMaanden();
  return NextResponse.json({ maanden, laatste: maanden[0] ?? null });
}
