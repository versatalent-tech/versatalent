import { NextResponse } from 'next/server';
import type { BookingContext } from './route-helpers';
import { canSeeTalent, findClashes } from '@/lib/db/repositories/bookings';
import { getCrmScope, getDeal, getOrganisation } from '@/lib/db/repositories/crm';

/**
 * Check what a booking points at: a talent in the person's scope, and a deal
 * and client they can see. Returns a message, or null when fine.
 */
export async function checkBookingLinks(
  ctx: BookingContext,
  data: { talent_id?: string; deal_id?: string | null; organisation_id?: string | null }
): Promise<string | null> {
  if (data.talent_id && !canSeeTalent(ctx.scope, data.talent_id)) {
    return 'You can only book talents assigned to you';
  }
  if (data.deal_id || data.organisation_id) {
    const crm = await getCrmScope(ctx.session);
    if (data.deal_id && !(await getDeal(crm, data.deal_id))) return 'Deal not found';
    if (data.organisation_id && !(await getOrganisation(crm, data.organisation_id))) return 'Client not found';
  }
  return null;
}

/** 409 listing the clashes, unless there are none or the person chose to save anyway */
export async function clashResponse(
  booking: { talent_id: string; starts_at: string; ends_at: string; status: string },
  force: boolean | undefined,
  excludeId?: string
): Promise<Response | null> {
  if (force || booking.status === 'cancelled' || booking.status === 'completed') return null;
  const clashes = await findClashes(booking.talent_id, booking.starts_at, booking.ends_at, excludeId);
  if (clashes.length === 0) return null;
  return NextResponse.json(
    { success: false, error: 'This clashes with something already in the calendar', code: 'CLASH', clashes },
    { status: 409 }
  );
}
