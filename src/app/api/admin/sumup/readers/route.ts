import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getSumUpConfigHints, getSumUpConfigStatus, listReaders, pairReader, SumUpApiError } from '@/lib/services/sumup';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

// GET - SumUp setup status and all readers (admin only)
// Always returns the settings status, even when SumUp rejects the request,
// so the page can show what to fix.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const config = getSumUpConfigStatus();
  const hints = getSumUpConfigHints();
  if (!Object.values(config).every(Boolean)) {
    return NextResponse.json({ config, hints, readers: [] });
  }
  try {
    const readers = await listReaders();
    return NextResponse.json({ config, hints, readers });
  } catch (error) {
    if (error instanceof SumUpApiError) {
      const help =
        error.status === 401
          ? 'SumUp rejected the API key. Check SUMUP_API_KEY is the secret key (sup_sk_…) for the same SumUp account as the merchant code, then redeploy.'
          : error.status === 403 || error.status === 404
            ? 'SumUp accepted the key but not the merchant code. Check SUMUP_MERCHANT_CODE belongs to the same account as the API key.'
            : undefined;
      return NextResponse.json({ config, hints, readers: [], error: `SumUp: ${error.message}`, help });
    }
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
