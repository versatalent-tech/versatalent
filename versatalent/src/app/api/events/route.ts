import { NextResponse } from 'next/server';
import { eventsSeed, queryEvents } from '@/lib/data/events';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;
  const city = searchParams.get('city') || undefined;
  const country = searchParams.get('country') || undefined;
  const status = (searchParams.get('status') as any) || 'upcoming';
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '12');

  const result = queryEvents(eventsSeed, { q, category, city, country, status, page, pageSize });
  return NextResponse.json(result, { status: 200 });
}
