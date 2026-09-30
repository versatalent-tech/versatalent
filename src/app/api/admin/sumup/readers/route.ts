import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getSumUpConfigStatus, listReaders, pairReader } from '@/lib/services/sumup';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

// GET - SumUp setup status and all readers (admin only)
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const config = getSumUpConfigStatus();
  if (!Object.values(config).every(Boolean)) {
    return NextResponse.json({ config, readers: [] });
  }
  try {
    const readers = await listReaders();
    return NextResponse.json({ config, readers });
  } catch (error) {
    return sumupErrorResponse(error, 'load card readers');
  }
}

// POST - Pair a Solo reader { pairing_code, name } (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { pairing_code, name } = await request.json();
    const code = typeof pairing_code === 'string' ? pairing_code.trim().toUpperCase() : '';
    const readerName = typeof name === 'string' ? name.trim().slice(0, 50) : '';
    if (!code || !readerName) {
      return NextResponse.json({ error: 'Pairing code and reader name are required' }, { status: 400 });
    }
    const reader = await pairReader(code, readerName);
    return NextResponse.json({ reader }, { status: 201 });
  } catch (error) {
    return sumupErrorResponse(error, 'pair the reader');
  }
}
