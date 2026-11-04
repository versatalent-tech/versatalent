import { listEventsOnSale } from '@/lib/db/repositories/tickets';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

/** GET /api/tickets/on-sale - upcoming events with tickets on sale (member pass page) */
export async function GET() {
  try {
    return successResponse(await listEventsOnSale());
  } catch (error) {
    console.error('Events on sale error:', error);
    return ApiErrors.ServerError('Couldn’t load events');
  }
}
