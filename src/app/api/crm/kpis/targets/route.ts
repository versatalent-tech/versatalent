import { NextRequest } from 'next/server';
import { z } from 'zod';
import { crmContext, parseBody } from '@/lib/crm/route-helpers';
import { sql } from '@/lib/db/client';
import { KPIS } from '@/lib/kpis/types';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Use a month like 2026-10'),
  metric: z.string().refine((m) => KPIS.some((k) => k.key === m), 'Unknown KPI'),
  target: z.number().min(0).max(1_000_000_000).nullable(),
});

// PUT /api/crm/kpis/targets { month: 'YYYY-MM', metric, target | null } - admins set (or clear) a monthly target
export async function PUT(request: NextRequest) {
  const ctx = await crmContext('crm.view');
  if ('response' in ctx) return ctx.response;
  if (ctx.session.role !== 'admin') return ApiErrors.Forbidden('Only admins set targets');
  const body = await parseBody(request, schema);
  if ('response' in body) return body.response;
  const { month, metric, target } = body.data;

  try {
    if (target === null || target === undefined) {
      await sql`DELETE FROM kpi_targets WHERE metric = ${metric} AND month = ${`${month}-01`}::date`;
    } else {
      await sql`
        INSERT INTO kpi_targets (metric, month, target, set_by, updated_at)
        VALUES (${metric}, ${`${month}-01`}::date, ${target}, ${ctx.actor.userId}, NOW())
        ON CONFLICT (metric, month) DO UPDATE SET target = EXCLUDED.target, set_by = EXCLUDED.set_by, updated_at = NOW()
      `;
    }
    await logAudit(ctx.actor, 'set_target', 'kpi', metric, { after: { month, target } });
    return successResponse(null, 'Target saved');
  } catch (error) {
    console.error('Error saving KPI target:', error);
    return ApiErrors.ServerError('Failed to save the target');
  }
}
