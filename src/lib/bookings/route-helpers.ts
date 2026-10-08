import { requireTeamPermission, type TeamSession } from '@/lib/middleware/auth';
import { can, type Permission } from '@/lib/auth/permissions';
import { getBookingScope, type BookingActor, type BookingScope } from '@/lib/db/repositories/bookings';

export interface BookingContext {
  session: TeamSession;
  scope: BookingScope;
  actor: BookingActor;
  /** May see fees, commission and net (admins and managers) */
  withMoney: boolean;
}

/** Signed-in team member with the permission, plus their talent scope; or a response to return */
export async function bookingContext(permission: Permission): Promise<BookingContext | { response: Response }> {
  const auth = await requireTeamPermission(permission);
  if ('response' in auth) return auth;
  return {
    session: auth.session,
    scope: await getBookingScope(auth.session),
    actor: { userId: auth.session.userId ?? null, name: auth.session.name ?? null },
    withMoney: can(auth.session.role, 'bookings.fees'),
  };
}

const MAX_RANGE_DAYS = 400;

/** Read and check ?from=&to= (ISO dates); null when missing or too wide */
export function readRange(params: URLSearchParams): { from: string; to: string } | null {
  const from = params.get('from');
  const to = params.get('to');
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) return null;
  return { from: start.toISOString(), to: end.toISOString() };
}
