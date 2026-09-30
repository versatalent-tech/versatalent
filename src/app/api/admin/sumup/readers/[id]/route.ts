import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { unpairReader } from '@/lib/services/sumup';
import { sumupErrorResponse } from '@/lib/utils/sumup-errors';

// DELETE - Unpair a reader from the SumUp account (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    await unpairReader(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return sumupErrorResponse(error, 'unpair the reader');
  }
}
