import { requireTeamPermission } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';
import {
  getDashboardSummary,
  getScopedDashboardSummary,
  type DashboardAttentionItem,
} from '@/lib/db/repositories/dashboard';
import { getCrmAttention, getCrmScope } from '@/lib/db/repositories/crm';
import { getTalentScope } from '@/lib/db/repositories/team';
import { countHoldsStartingSoon, getBookingScope, listUpcomingBookings } from '@/lib/db/repositories/bookings';
import { STALE_DEAL_DAYS } from '@/lib/crm/types';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// GET /api/admin/dashboard - figures for the admin home page, shaped by role
export async function GET() {
  const auth = await requireTeamPermission('dashboard.view');
  if ('response' in auth) return auth.response;

  const { session } = auth;
  const viewer = { name: session.name ?? null, role: session.role, canUseCrm: can(session.role, 'crm.view') };

  try {
    const scope = await getTalentScope(session);
    const bookingScope = await getBookingScope(session);
    const [summary, crmItems, upcomingBookings, holdsSoon] = await Promise.all([
      scope === 'all' ? getDashboardSummary() : getScopedDashboardSummary(scope),
      viewer.canUseCrm ? crmAttentionItems(session) : Promise.resolve([]),
      listUpcomingBookings(bookingScope),
      countHoldsStartingSoon(bookingScope),
    ]);

    const bookingItems: DashboardAttentionItem[] =
      holdsSoon > 0 && can(session.role, 'bookings.edit')
        ? [{
            key: 'holds-soon',
            severity: 'medium',
            label: `${plural(holdsSoon, 'booking')} in the next 14 days still on hold`,
            detail: 'Confirm with the client or release the date.',
            href: '/admin/bookings',
          }]
        : [];
    const attention = [...crmItems, ...bookingItems, ...summary.attention];

    const data =
      scope === 'all'
        ? { view: 'full' as const, viewer, ...summary, upcoming_bookings: upcomingBookings, attention }
        : { view: 'scoped' as const, viewer, ...summary, upcoming_bookings: upcomingBookings, attention };

    const response = successResponse(data);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Error building admin dashboard:', error);
    return errorResponse('Failed to load dashboard figures', 500);
  }
}

async function crmAttentionItems(session: Parameters<typeof getCrmScope>[0]): Promise<DashboardAttentionItem[]> {
  const crm = await getCrmAttention(await getCrmScope(session), can(session.role, 'enquiries.view'));
  const items: DashboardAttentionItem[] = [];

  if (crm.new_enquiries) {
    items.push({
      key: 'new-enquiries',
      severity: 'high',
      label: `${crm.new_enquiries} new website ${crm.new_enquiries === 1 ? 'enquiry' : 'enquiries'}`,
      detail: 'Reply quickly: convert to a deal, archive or mark as spam.',
      href: '/admin/crm/enquiries',
    });
  }
  if (crm.overdue_tasks) {
    items.push({
      key: 'overdue-tasks',
      severity: 'high',
      label: `${plural(crm.overdue_tasks, 'overdue task')} of yours`,
      detail: 'Follow-ups that are past their due date.',
      href: '/admin/crm/tasks',
    });
  }
  if (crm.stale_deals) {
    items.push({
      key: 'stale-deals',
      severity: 'medium',
      label: `${plural(crm.stale_deals, 'deal')} gone quiet`,
      detail: `No activity for ${STALE_DEAL_DAYS}+ days. Log a follow-up or close them.`,
      href: '/admin/crm',
    });
  }
  return items;
}
