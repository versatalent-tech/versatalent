import { sql } from '../client';

/**
 * Admin dashboard figures, read live from the database.
 *
 * Money is reported per currency: older orders are EUR, newer ones GBP,
 * and adding the two together would give a meaningless number.
 */

// A SumUp payment that hasn't confirmed after this long needs a human to look at it
const STUCK_ORDER_MINUTES = 30;

export interface CurrencyTotal {
  currency: string;
  cents: number;
  orders: number;
}

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  venue_name: string | null;
  talent_names: string[];
  is_published: boolean;
}

export interface DashboardRecentOrder {
  id: string;
  total_cents: number;
  currency: string;
  status: string;
  payment_method: string | null;
  customer_name: string | null;
  created_at: string;
}

export interface DashboardAttentionItem {
  key: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
  detail: string;
  href: string;
}

export interface DashboardSummary {
  generated_at: string;
  roster: {
    active_talents: number;
    inactive_talents: number;
    talents_with_portal_account: number;
  };
  events: {
    upcoming: number;
    next_30_days: number;
    unpublished_upcoming: number;
  };
  sales: {
    revenue_30d: CurrencyTotal[];
    revenue_prev_30d: CurrencyTotal[];
    paid_orders_30d: number;
  };
  community: {
    vip_members: number;
    vip_by_tier: Record<string, number>;
    checkins_30d: number;
    newsletter_active: number;
    newsletter_new_30d: number;
  };
  content: {
    published_posts: number;
    draft_posts: number;
    last_published_at: string | null;
  };
  upcoming_events: DashboardUpcomingEvent[];
  recent_orders: DashboardRecentOrder[];
  attention: DashboardAttentionItem[];
}

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    talentRows,
    eventRows,
    revenueRows,
    vipRows,
    checkinRows,
    newsletterRows,
    blogRows,
    upcomingRows,
    recentOrderRows,
    stuckOrderRows,
    staleEventRows,
    lowStockRows,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE t.is_active) AS active,
        COUNT(*) FILTER (WHERE NOT t.is_active) AS inactive,
        COUNT(*) FILTER (WHERE t.is_active AND EXISTS (
          SELECT 1 FROM users u WHERE u.talent_id = t.id AND u.password_hash IS NOT NULL
        )) AS with_account
      FROM talents t
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE start_time >= NOW() AND status <> 'cancelled') AS upcoming,
        COUNT(*) FILTER (WHERE start_time >= NOW() AND start_time < NOW() + INTERVAL '30 days'
                           AND status <> 'cancelled') AS next_30,
        COUNT(*) FILTER (WHERE start_time >= NOW() AND status <> 'cancelled' AND NOT is_published) AS unpublished
      FROM events
    `,
    sql`
      SELECT
        currency,
        CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'current' ELSE 'previous' END AS period,
        SUM(total_cents) AS cents,
        COUNT(*) AS orders
      FROM pos_orders
      WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '60 days'
      GROUP BY 1, 2
    `,
    sql`
      SELECT tier, COUNT(*) AS n
      FROM vip_memberships
      WHERE status = 'active'
      GROUP BY tier
    `,
    sql`
      SELECT COUNT(*) AS n FROM checkins WHERE "timestamp" >= NOW() - INTERVAL '30 days'
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE is_active) AS active,
        COUNT(*) FILTER (WHERE is_active AND subscribed_at >= NOW() - INTERVAL '30 days') AS new_30
      FROM newsletter_subscribers
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE is_published) AS published,
        COUNT(*) FILTER (WHERE NOT is_published) AS drafts,
        MAX(published_at) FILTER (WHERE is_published) AS last_published
      FROM blog_posts
    `,
    sql`
      SELECT
        e.id, e.title, e.start_time, e.venue->>'name' AS venue_name, e.is_published,
        COALESCE(
          (SELECT array_agg(t.name ORDER BY t.name) FROM talents t WHERE t.id::text = ANY(e.talent_ids)),
          '{}'
        ) AS talent_names
      FROM events e
      WHERE e.start_time >= NOW() AND e.status <> 'cancelled'
      ORDER BY e.start_time ASC
      LIMIT 5
    `,
    sql`
      SELECT o.id, o.total_cents, o.currency, o.status, o.payment_method, o.created_at, u.name AS customer_name
      FROM pos_orders o
      LEFT JOIN users u ON u.id = o.customer_user_id
      ORDER BY o.created_at DESC
      LIMIT 6
    `,
    sql`
      SELECT COUNT(*) AS n
      FROM pos_orders
      WHERE status = 'pending' AND created_at < NOW() - make_interval(mins => ${STUCK_ORDER_MINUTES})
    `,
    sql`
      SELECT COUNT(*) AS n
      FROM events
      WHERE status IN ('upcoming', 'ongoing') AND COALESCE(end_time, start_time) < NOW() - INTERVAL '1 day'
    `,
    sql`
      SELECT name, stock_quantity
      FROM products
      WHERE is_active AND stock_quantity <= COALESCE(low_stock_threshold, 0)
      ORDER BY stock_quantity ASC
    `,
  ]);

  const talents = talentRows[0];
  const events = eventRows[0];

  const revenueFor = (period: 'current' | 'previous'): CurrencyTotal[] =>
    revenueRows
      .filter((row: any) => row.period === period)
      .map((row: any) => ({
        currency: row.currency,
        cents: toNumber(row.cents),
        orders: toNumber(row.orders),
      }))
      .sort((a: CurrencyTotal, b: CurrencyTotal) => b.cents - a.cents);

  const revenue30 = revenueFor('current');

  const vipByTier: Record<string, number> = {};
  for (const row of vipRows as any[]) {
    vipByTier[row.tier] = toNumber(row.n);
  }

  const activeTalents = toNumber(talents.active);
  const withAccount = toNumber(talents.with_account);
  const unpublishedUpcoming = toNumber(events.unpublished);
  const upcomingCount = toNumber(events.upcoming);
  const stuckOrders = toNumber(stuckOrderRows[0].n);
  const staleEvents = toNumber(staleEventRows[0].n);

  const attention: DashboardAttentionItem[] = [];

  if (stuckOrders > 0) {
    attention.push({
      key: 'stuck-orders',
      severity: 'high',
      label: `${stuckOrders} order${stuckOrders === 1 ? '' : 's'} stuck in "pending"`,
      detail: `Unconfirmed for over ${STUCK_ORDER_MINUTES} minutes. Check SumUp, then mark paid or cancel.`,
      href: '/admin/pos/orders',
    });
  }
  if (lowStockRows.length > 0) {
    const names = (lowStockRows as any[]).slice(0, 3).map((row) => row.name).join(', ');
    attention.push({
      key: 'low-stock',
      severity: 'medium',
      label: `${lowStockRows.length} product${lowStockRows.length === 1 ? '' : 's'} low on stock`,
      detail: names + (lowStockRows.length > 3 ? '…' : ''),
      href: '/admin/pos/products',
    });
  }
  if (staleEvents > 0) {
    attention.push({
      key: 'stale-events',
      severity: 'medium',
      label: `${staleEvents} past event${staleEvents === 1 ? '' : 's'} still marked upcoming`,
      detail: 'Set them to completed so the public site and reports stay accurate.',
      href: '/admin/events',
    });
  }
  if (unpublishedUpcoming > 0) {
    attention.push({
      key: 'unpublished-events',
      severity: 'medium',
      label: `${unpublishedUpcoming} upcoming event${unpublishedUpcoming === 1 ? '' : 's'} not published`,
      detail: 'Visitors can’t see these yet.',
      href: '/admin/events',
    });
  }
  if (upcomingCount === 0) {
    attention.push({
      key: 'no-upcoming-events',
      severity: 'low',
      label: 'No upcoming events scheduled',
      detail: 'The events page has nothing coming up for visitors.',
      href: '/admin/events',
    });
  }
  if (activeTalents > withAccount) {
    const missing = activeTalents - withAccount;
    attention.push({
      key: 'talents-without-login',
      severity: 'low',
      label: `${missing} active talent${missing === 1 ? '' : 's'} without a login`,
      detail: 'Needed before they can use the talent portal.',
      href: '/admin/talents',
    });
  }

  return {
    generated_at: new Date().toISOString(),
    roster: {
      active_talents: activeTalents,
      inactive_talents: toNumber(talents.inactive),
      talents_with_portal_account: withAccount,
    },
    events: {
      upcoming: upcomingCount,
      next_30_days: toNumber(events.next_30),
      unpublished_upcoming: unpublishedUpcoming,
    },
    sales: {
      revenue_30d: revenue30,
      revenue_prev_30d: revenueFor('previous'),
      paid_orders_30d: revenue30.reduce((sum, row) => sum + row.orders, 0),
    },
    community: {
      vip_members: Object.values(vipByTier).reduce((sum, n) => sum + n, 0),
      vip_by_tier: vipByTier,
      checkins_30d: toNumber(checkinRows[0].n),
      newsletter_active: toNumber(newsletterRows[0].active),
      newsletter_new_30d: toNumber(newsletterRows[0].new_30),
    },
    content: {
      published_posts: toNumber(blogRows[0].published),
      draft_posts: toNumber(blogRows[0].drafts),
      last_published_at: blogRows[0].last_published ? toIso(blogRows[0].last_published) : null,
    },
    upcoming_events: (upcomingRows as any[]).map((row) => ({
      id: row.id,
      title: row.title,
      start_time: toIso(row.start_time),
      venue_name: row.venue_name,
      talent_names: row.talent_names ?? [],
      is_published: row.is_published,
    })),
    recent_orders: (recentOrderRows as any[]).map((row) => ({
      id: row.id,
      total_cents: toNumber(row.total_cents),
      currency: row.currency,
      status: row.status,
      payment_method: row.payment_method,
      customer_name: row.customer_name,
      created_at: toIso(row.created_at),
    })),
    attention,
  };
}
