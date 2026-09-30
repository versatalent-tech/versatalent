import { NextRequest, NextResponse } from 'next/server';
import { withPOSAuth } from '@/lib/auth/pos-auth';
import { listReaders } from '@/lib/services/sumup';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

// GET /api/pos/sumup/readers - paired SumUp readers the till can charge to
export const GET = withPOSAuth(async (_request: NextRequest) => {
  try {
    const readers = await listReaders();
    return NextResponse.json({
      readers: readers
        .filter((r) => r.status === 'paired')
        .map((r) => ({ id: r.id, name: r.name, model: r.device?.model })),
    });
  } catch (error) {
    return sumupErrorResponse(error, 'load card readers');
  }
});
