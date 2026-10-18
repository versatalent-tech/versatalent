import type { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';
import {
  getDashboardSummary,
  getScopedDashboardSummary,
  type DashboardAttentionItem,
} from '@/lib/db/repositories/dashboard';
import { getCrmAttention, getCrmScope } from '@/lib/db/repositories/crm';
import { countDue } from '@/lib/db/repositories/prospecting';
import { getTalentScope } from '@/lib/db/repositories/team';
import {
  countDeclinedUpcoming,
  countHoldsStartingSoon,
  getBookingScope,
  listUpcomingBookings,
  summariseOwedPayouts,
} from '@/lib/db/repositories/bookings';
import { formatCurrency } from '@/lib/utils/formatting';
import { sql } from '@/lib/db/client';
import { countCardRequests } from '@/lib/db/repositories/membership';
import { getFoundingSettings, getFoundingStats } from '@/lib/db/repositories/founding';
import { getCampaignSettings, listCandidates } from '@/lib/db/repositories/outreach';
import { countReferralsToReview } from '@/lib/db/repositories/referrals';
import { listExpiringDocuments } from '@/lib/db/repositories/documents';
import { EXPIRY_WARNING_DAYS } from '@/lib/documents/types';
import { STALE_DEAL_DAYS } from '@/lib/crm/types';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// GET /api/admin/dashboard - figures for the admin home page, shaped by role
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('dashboard.view');
  if ('response' in auth) return auth.response;

  const { session } = auth;
  const viewer = { name: session.name ?? null, role: session.role, canUseCrm: can(session.role, 'crm.view') };

  try {
    const scope = await getTalentScope(session);
    const bookingScope = await getBookingScope(session);
    const [summary, crmItems, upcomingBookings, holdsSoon, declined, profileRequests, owed, cards, founding, renewalsDue, referralsToReview, expiringDocs] = await Promise.all([
      scope === 'all' ? getDashboardSummary() : getScopedDashboardSummary(scope),
      viewer.canUseCrm ? crmAttentionItems(session) : Promise.resolve([]),
      listUpcomingBookings(bookingScope),
      countHoldsStartingSoon(bookingScope),
      countDeclinedUpcoming(bookingScope),
      can(session.role, 'portal.manage')
        ? sql`SELECT COUNT(*) AS n FROM talent_profile_changes WHERE status = 'pending'`.then((r: any) => Number(r[0].n))
        : Promise.resolve(0),
      can(session.role, 'payouts.manage') ? summariseOwedPayouts(bookingScope) : Promise.resolve({ count: 0, totals: [] }),
      can(session.role, 'venue.manage') ? countCardRequests() : Promise.resolve(null),
      can(session.role, 'venue.manage')
        ? getFoundingSettings().then(getFoundingStats).catch(() => null)
        : Promise.resolve(null),
      can(session.role, 'venue.manage')
        ? getCampaignSettings()
            .then((c) => (c.founding_renewal.enabled ? listCandidates('founding_renewal', request.nextUrl.origin).then((l) => l.length) : 0))
            .catch(() => 0)
        : Promise.resolve(0),
      can(session.role, 'venue.manage') ? countReferralsToReview().catch(() => 0) : Promise.resolve(0),
      can(session.role, 'bookings.edit')
        ? listExpiringDocuments(bookingScope, EXPIRY_WARNING_DAYS, session.role === 'admin').catch(() => [])
        : Promise.resolve([]),
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
    if (declined > 0 && can(session.role, 'bookings.edit')) {
      bookingItems.unshift({
        key: 'declined-bookings',
        severity: 'high',
        label: `${plural(declined, 'upcoming booking')} declined by the talent`,
        detail: 'Find a replacement or cancel with the client.',
        href: '/admin/bookings',
      });
    }
    if (owed.count > 0) {
      bookingItems.push({
        key: 'payouts-owed',
        severity: 'medium',
        label: `${plural(owed.count, 'finished job')} not paid to the talent yet`,
        detail: `${owed.totals.map((t) => formatCurrency(t.cents, t.currency)).join(' + ')} owed in total.`,
        href: '/admin/bookings/payouts',
      });
    }
    const cardsToSend = cards ? cards.to_post + cards.card_assigned : 0;
    if (cardsToSend > 0) {
      bookingItems.unshift({
        key: 'cards-to-post',
        severity: 'high',
        label: `${plural(cardsToSend, 'membership card')} to post`,
        detail: 'Paid online applications: link a card, write it and post it.',
        href: '/admin/membership-cards',
      });
    }
    if (founding && founding.needs_refund > 0) {
      bookingItems.unshift({
        key: 'founding-refunds',
        severity: 'high',
        label: `${plural(founding.needs_refund, 'Founding Membership payment')} to refund`,
        detail: 'Money arrived that didn’t start a membership year (e.g. paid twice). Refund it in SumUp.',
        href: '/admin/founding-members',
      });
    }
    if (renewalsDue > 0) {
      bookingItems.push({
        key: 'founding-renewals',
        severity: 'medium',
        label: `${plural(renewalsDue, 'Founding Membership')} ending within 30 days`,
        detail: 'Send the renewal reminder from Member outreach, then mark it sent.',
        href: '/admin/outreach',
      });
    }
    if (referralsToReview > 0) {
      bookingItems.push({
        key: 'referrals-review',
        severity: 'low',
        label: `${plural(referralsToReview, 'referral')} to review`,
        detail: 'Flagged (shared phone or address, or over the yearly limit) before points are paid.',
        href: '/admin/referrals',
      });
    }
    if (expiringDocs.length > 0) {
      bookingItems.push({
        key: 'documents-expiring',
        severity: 'medium',
        label: `${plural(expiringDocs.length, 'talent document')} expired, expiring soon or due for deletion`,
        detail: 'Insurance and ID documents: ask the talent for a new copy, or delete ID documents past their date.',
        href: '/admin/bookings/talent-documents',
      });
    }
    if (profileRequests > 0) {
      bookingItems.push({
        key: 'profile-requests',
        severity: 'low',
        label: `${plural(profileRequests, 'profile change')} waiting for approval`,
        detail: 'Talents suggested edits to their public profiles.',
        href: '/admin/talent-portal',
      });
    }
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
  const scope = await getCrmScope(session);
  const [crm, prospectingDue] = await Promise.all([
    getCrmAttention(scope, can(session.role, 'enquiries.view')),
    scope.userId ? countDue(scope, scope.userId).catch(() => 0) : Promise.resolve(0),
  ]);
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
  if (prospectingDue > 0) {
    items.push({
      key: 'prospecting-due',
      severity: 'medium',
      label: `${plural(prospectingDue, 'prospecting step')} due today`,
      detail: 'Send them from your own email, LinkedIn or phone, then record what happened.',
      href: '/admin/crm/prospecting',
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
