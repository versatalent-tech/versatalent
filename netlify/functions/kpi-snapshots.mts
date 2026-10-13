/**
 * Scheduled function: saves each month's agency-wide KPI figures, so the
 * trend for closed months doesn't change when old records are edited.
 *
 * Runs daily. Saves the current month (so far) every day, and the month
 * just ended on the first three days of a new month, after which it's left
 * alone.
 */
import { addMonths, monthStart, saveSnapshot } from '../../src/lib/kpis/compute';

export default async () => {
  const current = monthStart(new Date());
  await saveSnapshot(current);
  const dayOfMonth = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric' }).format(new Date()));
  if (dayOfMonth <= 3) await saveSnapshot(addMonths(current, -1));
};

export const config = { schedule: '@daily' };
