import { NextResponse } from 'next/server';
import { eventsSeed } from '@/lib/data/events';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const event = eventsSeed.find(e => e.id === params.id);
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(event);
}
