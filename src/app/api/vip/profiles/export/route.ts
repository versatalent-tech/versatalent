import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getVIPsForExport, type VIPExportFilters } from '@/lib/db/repositories/vip-profiles';
import { AGE_RANGES, type AgeRange } from '@/lib/vip-profile';

const COLUMNS: [header: string, key: string][] = [
  ['Name', 'name'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Age range', 'age_range'],
  ['Address line 1', 'address_line1'],
  ['Address line 2', 'address_line2'],
  ['City', 'city'],
  ['Postcode', 'postcode'],
  ['Country', 'country'],
  ['Interests', 'interests'],
  ['Heard about us', 'referral_source'],
  ['Email consent', 'consent_email'],
  ['SMS consent', 'consent_sms'],
  ['Post consent', 'consent_post'],
  ['Consent updated', 'consent_updated_at'],
  ['Tier', 'tier'],
  ['Points', 'points_balance'],
  ['Registered', 'registered_at'],
];

function csvCell(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) text = '';
  else if (Array.isArray(value)) text = value.join('; ');
  else if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'boolean') text = value ? 'Yes' : 'No';
  else text = String(value);

  // Stop spreadsheets from treating the cell as a formula (CSV injection)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * GET /api/vip/profiles/export - VIP list as CSV for marketing (admin only)
 * Query params:
 * - consent: email | sms | post (only VIPs who agreed to that channel)
 * - age_range: one of AGE_RANGES
 * - city: exact city match (case-insensitive)
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: VIPExportFilters = {};

    const consent = searchParams.get('consent');
    if (consent === 'email' || consent === 'sms' || consent === 'post') filters.consent = consent;

    const ageRange = searchParams.get('age_range');
    if (ageRange && AGE_RANGES.includes(ageRange as AgeRange)) filters.ageRange = ageRange as AgeRange;

    const city = searchParams.get('city');
    if (city?.trim()) filters.city = city;

    const rows = await getVIPsForExport(filters);
    const lines = [
      COLUMNS.map(([header]) => csvCell(header)).join(','),
      ...rows.map((row) => COLUMNS.map(([, key]) => csvCell((row as any)[key])).join(',')),
    ];

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="versatalent-vips-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting VIPs:', error);
    return NextResponse.json({ error: 'Failed to export VIPs' }, { status: 500 });
  }
}
