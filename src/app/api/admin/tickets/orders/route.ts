import { NextRequest, NextResponse } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { listTicketOrders, ticketSummary, type AdminTicketOrder } from '@/lib/db/repositories/tickets';
import { HEARD_FROM, ORDER_STATUS_LABELS, instagramUrl } from '@/lib/tickets/types';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const STATUSES = Object.keys(ORDER_STATUS_LABELS);

/** Quote for CSV, and stop spreadsheet apps treating a value as a formula */
function cell(value: unknown): string {
  let v = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toCsv(orders: AdminTicketOrder[]): string {
  const header = [
    'Reference', 'Event', 'Status', 'Ordered', 'Paid', 'Tickets', 'Ticket types', 'Total (£)', 'First name', 'Last name',
    'Email', 'Phone', 'Instagram', 'Instagram link', 'City', 'Age range', 'Heard from', 'Marketing consent', 'Source', 'UTM source',
    'UTM medium', 'UTM campaign', 'Referrer', 'Member', 'Points', 'Earlier orders', 'Arrived', 'Refunded', 'Refund reason',
  ];
  const rows = orders.map((o) => [
    o.reference, o.event_title, ORDER_STATUS_LABELS[o.status] ?? o.status, o.created_at, o.paid_at ?? '', o.quantity,
    o.items.map((i) => `${i.quantity} × ${i.name}`).join('; '), (o.total_cents / 100).toFixed(2), o.first_name, o.last_name,
    o.email, o.phone ?? '', o.instagram, instagramUrl(o.instagram), o.city ?? '', o.age_range ?? '',
    o.heard_from ? HEARD_FROM[o.heard_from as keyof typeof HEARD_FROM] ?? o.heard_from : '', o.marketing_consent ? 'Yes' : 'No',
    o.source, o.utm_source ?? '', o.utm_medium ?? '', o.utm_campaign ?? '', o.referrer ?? '', o.member?.name ?? '',
    o.points_awarded, o.previous_orders, o.arrived_at ?? '', o.refunded_at ?? '', o.refund_reason ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

/**
 * GET /api/admin/tickets/orders?event=&status=&q=&format=csv - orders with
 * buyer details, plus a summary of paid orders; or a CSV download (admin)
 */
export async function GET(request: NextRequest) {
  const auth = await requireTeamPermission('venue.manage');
  if ('response' in auth) return auth.response;
  const params = request.nextUrl.searchParams;
  const eventId = params.get('event');
  const status = params.get('status');
  if (eventId && !isValidUUID(eventId)) return ApiErrors.BadRequest('Unknown event');
  if (status && !STATUSES.includes(status)) return ApiErrors.BadRequest('Unknown status');

  try {
    const filters = { eventId: eventId || null, status: status || null, search: params.get('q') };
    if (params.get('format') === 'csv') {
      const orders = await listTicketOrders({ ...filters, limit: 20000 });
      const day = new Date().toISOString().slice(0, 10);
      return new NextResponse('﻿' + toCsv(orders), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ticket-orders-${day}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    const [orders, summary] = await Promise.all([listTicketOrders(filters), ticketSummary(filters.eventId)]);
    return successResponse({ orders, summary });
  } catch (error) {
    console.error('Ticket orders error:', error);
    return ApiErrors.ServerError('Couldn’t load orders');
  }
}
