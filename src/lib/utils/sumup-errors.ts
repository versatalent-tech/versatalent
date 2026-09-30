import { NextResponse } from 'next/server';
import { SumUpApiError, SumUpNotConfiguredError } from '@/lib/services/sumup';

/** API response for SumUp errors, with a message staff can act on */
export function sumupErrorResponse(error: unknown, action: string) {
  if (error instanceof SumUpNotConfiguredError) {
    return NextResponse.json(
      { error: 'Card payments are not set up yet. Add the SumUp settings in Netlify.', code: 'SUMUP_NOT_CONFIGURED' },
      { status: 503 }
    );
  }
  if (error instanceof SumUpApiError) {
    console.error(`[sumup] ${action} failed (${error.status}): ${error.message}`);
    return NextResponse.json({ error: `SumUp: ${error.message}` }, { status: 502 });
  }
  console.error(`[sumup] ${action} failed:`, error);
  return NextResponse.json({ error: `Failed to ${action}` }, { status: 500 });
}
