/**
 * KPI definitions shared by the API, the nightly snapshot and the page.
 * No imports: used by the Netlify function and client components alike.
 */

export type KpiUnit = 'count' | 'percent' | 'money' | 'hours' | 'days';

export interface KpiDefinition {
  key: string;
  label: string;
  group: 'sales' | 'outreach' | 'bookings' | 'membership';
  unit: KpiUnit;
  /** For the arrow colour: is a higher number good? */
  higherIsBetter: boolean;
  adminOnly?: boolean;
  /** Plain-English definition, shown under the figure */
  definition: string;
}

export const KPIS: KpiDefinition[] = [
  { key: 'new_leads', label: 'New leads', group: 'sales', unit: 'count', higherIsBetter: true, definition: 'Deals created in the period' },
  { key: 'win_rate', label: 'Lead → won rate', group: 'sales', unit: 'percent', higherIsBetter: true, definition: 'Won ÷ (won + lost), for deals closed in the period' },
  { key: 'weighted_pipeline', label: 'Weighted pipeline', group: 'sales', unit: 'money', higherIsBetter: true, definition: 'Open deals × stage probability, today (GBP)' },
  { key: 'avg_deal_value', label: 'Average deal value', group: 'sales', unit: 'money', higherIsBetter: true, definition: 'Mean value of deals won in the period (GBP)' },
  { key: 'sales_cycle_days', label: 'Sales cycle', group: 'sales', unit: 'days', higherIsBetter: false, definition: 'Median days from created to won, for deals won in the period' },
  { key: 'repeat_client_rate', label: 'Repeat clients', group: 'sales', unit: 'percent', higherIsBetter: true, definition: 'Share of deals won from clients who had won a deal before' },
  { key: 'first_response_hours', label: 'First response time', group: 'sales', unit: 'hours', higherIsBetter: false, definition: 'Median hours from a website enquiry to someone handling it. Aim: under 24' },
  { key: 'outreach_contacted', label: 'Prospects contacted', group: 'outreach', unit: 'count', higherIsBetter: true, definition: 'Contacts sent their first prospecting message in the period' },
  { key: 'outreach_reply_rate', label: 'Prospecting reply rate', group: 'outreach', unit: 'percent', higherIsBetter: true, definition: 'Of those first contacted in the period, the share who replied or booked a meeting' },
  { key: 'meetings_booked', label: 'Meetings booked', group: 'outreach', unit: 'count', higherIsBetter: true, definition: 'Prospects who booked a meeting in the period' },
  { key: 'meetings_held', label: 'Meetings held', group: 'outreach', unit: 'count', higherIsBetter: true, definition: 'Meetings logged in the CRM that took place in the period' },
  { key: 'bookings_confirmed', label: 'Bookings', group: 'bookings', unit: 'count', higherIsBetter: true, definition: 'Confirmed or completed jobs taking place in the period' },
  { key: 'bookings_value', label: 'Bookings value', group: 'bookings', unit: 'money', higherIsBetter: true, definition: 'Gross fees of those jobs (GBP)' },
  { key: 'commission', label: 'Commission revenue', group: 'bookings', unit: 'money', higherIsBetter: true, adminOnly: true, definition: 'Fee × commission for confirmed or completed jobs that finished in the period (GBP)' },
  { key: 'utilisation', label: 'Talent utilisation', group: 'bookings', unit: 'percent', higherIsBetter: true, definition: 'Days with a confirmed job ÷ days available (not marked unavailable), active talents' },
  { key: 'cancellation_rate', label: 'Cancellation rate', group: 'bookings', unit: 'percent', higherIsBetter: false, definition: 'Cancelled ÷ all confirmed, completed and cancelled jobs in the period' },
  { key: 'new_members', label: 'New VIP members', group: 'membership', unit: 'count', higherIsBetter: true, adminOnly: true, definition: 'Memberships created in the period' },
  { key: 'member_checkins', label: 'Member check-ins', group: 'membership', unit: 'count', higherIsBetter: true, adminOnly: true, definition: 'Check-ins at the door in the period' },
  { key: 'member_spend', label: 'Member spend at the till', group: 'membership', unit: 'money', higherIsBetter: true, adminOnly: true, definition: 'Paid till orders linked to a member, after refunds (GBP)' },
  { key: 'founding_sold', label: 'Founding Memberships sold', group: 'membership', unit: 'count', higherIsBetter: true, adminOnly: true, definition: 'Paid in the period' },
];

export const KPI_GROUPS = {
  sales: 'Sales',
  outreach: 'Prospecting and meetings',
  bookings: 'Bookings',
  membership: 'Membership',
} as const;

export type KpiValues = Record<string, number | null>;

export interface TalentUtilisation {
  talent: { id: string; name: string };
  booked_days: number;
  available_days: number;
  rate: number | null;
}

export interface KpiReport {
  period: { from: string; to: string; label: string; month: string | null };
  values: KpiValues;
  previous: KpiValues;
  targets: Record<string, number>;
  leads_by_source: { source: string; count: number }[];
  utilisation: TalentUtilisation[];
  trend: { month: string; values: KpiValues }[];
  can_set_targets: boolean;
}

export function formatKpi(value: number | null | undefined, unit: KpiUnit): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  switch (unit) {
    case 'percent':
      return `${Math.round(value)}%`;
    case 'money':
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value / 100);
    case 'hours':
      return value < 1 ? `${Math.round(value * 60)} min` : `${value.toFixed(value < 10 ? 1 : 0)} h`;
    case 'days':
      return `${Math.round(value) || 0} day${Math.round(value) === 1 ? '' : 's'}`;
    default:
      return (Math.round(value) || 0).toLocaleString('en-GB');
  }
}
