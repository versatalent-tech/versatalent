import { NextRequest } from 'next/server';
import { crmContext } from '@/lib/crm/route-helpers';
import { sql } from '@/lib/db/client';
import { addMonths, computeKpis, loadSnapshots, monthStart, type KpiScope } from '@/lib/kpis/compute';
import { KPIS, type KpiReport, type KpiValues } from '@/lib/kpis/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const TREND_MONTHS = 6;
const MONTH_LABEL = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function label(from: string, to: string): string {
  const start = MONTH_LABEL.format(new Date(`${from}T00:00:00Z`));
  const lastMonth = addMonths(to, -1);
  return lastMonth === from ? start : `${start} – ${MONTH_LABEL.format(new Date(`${lastMonth}T00:00:00Z`))}`;
}

/**
 * GET /api/crm/kpis?range=month&month=YYYY-MM | range=last3 | range=ytd
 * Figures for the period, the period before it, monthly targets (single
 * months), leads by source, utilisation per talent and a 6-month trend.
 * Commission and membership figures are for admins only.
 */
export async function GET(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  const params = request.nextUrl.searchParams;
  const isAdmin = ctx.session.role === 'admin';

  const current = monthStart(new Date());
  const range = params.get('range') ?? 'month';
  const monthParam = params.get('month');
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? `${monthParam}-01` : current;
  let from: string;
  let to: string;
  if (range === 'last3') {
    from = addMonths(current, -2);
    to = addMonths(current, 1);
  } else if (range === 'ytd') {
    from = `${current.slice(0, 4)}-01-01`;
    to = addMonths(current, 1);
  } else {
    from = month;
    to = addMonths(month, 1);
  }
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
  const scope: KpiScope = { all: ctx.scope.all, userId: ctx.scope.userId, talentIds: ctx.scope.talentIds };
  const hide = (values: KpiValues) => {
    if (!isAdmin) for (const k of KPIS.filter((k) => k.adminOnly)) delete values[k.key];
    return values;
  };

  try {
    const lastTrendMonth = range === 'month' ? month : current;
    const trendMonths = Array.from({ length: TREND_MONTHS }, (_, i) => addMonths(lastTrendMonth, i - TREND_MONTHS + 1));
    const snapshots = scope.all ? await loadSnapshots(trendMonths[0], trendMonths[trendMonths.length - 1]) : {};

    const [main, previous, targetRows, trend] = await Promise.all([
      computeKpis(scope, from, to, { membership: isAdmin }),
      computeKpis(scope, addMonths(from, -months), from, { membership: isAdmin }),
      range === 'month' ? sql`SELECT metric, target FROM kpi_targets WHERE month = ${month}::date` : Promise.resolve([]),
      Promise.all(
        trendMonths.map(async (m) => {
          // Closed months come from the nightly snapshot when there is one, so later edits don't rewrite history
          const saved = m < current ? snapshots[m] : undefined;
          const values = saved ?? (await computeKpis(scope, m, addMonths(m, 1), { membership: isAdmin })).values;
          return { month: m, values: hide({ ...values }) };
        })
      ),
    ]);

    const report: KpiReport = {
      period: { from, to, label: label(from, to), month: range === 'month' ? month : null },
      values: hide(main.values),
      previous: hide(previous.values),
      targets: Object.fromEntries((targetRows as any[]).map((r) => [r.metric, Number(r.target)])),
      leads_by_source: main.leads_by_source,
      utilisation: main.utilisation,
      trend,
      can_set_targets: isAdmin,
    };
    return successResponse(report);
  } catch (error) {
    console.error('Error computing KPIs:', error);
    return ApiErrors.ServerError('Failed to work out the KPIs');
  }
}
