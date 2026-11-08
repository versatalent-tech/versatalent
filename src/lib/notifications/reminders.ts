/**
 * Hourly job (netlify/functions/talent-reminders.mts): reminders the day
 * before, in UK time, and clean-up of old notifications.
 * - 10:00: shared, confirmed bookings starting tomorrow
 * - 09:00: open tasks due tomorrow, for talents
 * The hour after is a catch-up (a run that failed or timed out); each
 * reminder has a dedupe key, so later runs only send what's missing.
 * Relative imports only.
 */
import { sql } from '../db/client';
import { deleteOldNotifications } from '../db/repositories/notifications';
import { AGENCY_TIME_ZONE } from '../bookings/types';
import { bookingReminder, taskDue } from './messages';
import { notify, notifyTalent } from './notify';

const BOOKING_HOURS = [10, 11];
const TASK_HOURS = [9, 10];
const KEEP_DAYS = 90;
/** Reminders sent at the same time, so a slow push service can't use up the run */
const BATCH = 20;

async function inBatches<T>(items: T[], send: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH) await Promise.allSettled(items.slice(i, i + BATCH).map(send));
}

function ukParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: AGENCY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

/** Tomorrow's UK date as YYYY-MM-DD */
function ukTomorrow(now: Date): string {
  const { year, month, day } = ukParts(now);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export async function runReminders(now = new Date()): Promise<{ bookings: number; tasks: number; deleted: number }> {
  const { hour } = ukParts(now);
  const tomorrow = ukTomorrow(now);
  let bookings = 0;
  let tasks = 0;
  const deleted = await deleteOldNotifications(KEEP_DAYS).catch((error) => {
    console.error('Deleting old notifications failed:', error);
    return 0;
  });

  if (BOOKING_HOURS.includes(hour)) {
    const rows = await sql`
      SELECT id, talent_id, title, starts_at, location, call_time FROM bookings
      WHERE status = 'confirmed' AND shared_with_talent
        AND (starts_at AT TIME ZONE ${AGENCY_TIME_ZONE})::date = ${tomorrow}::date
    `;
    await inBatches(rows, (b: any) => notifyTalent(b.talent_id, bookingReminder({ ...b, starts_at: new Date(b.starts_at).toISOString() }, tomorrow)));
    bookings = rows.length;
  }

  if (TASK_HOURS.includes(hour)) {
    const rows = await sql`
      SELECT a.id, a.subject, a.owner_user_id FROM activities a
      JOIN users u ON u.id = a.owner_user_id AND u.role = 'artist' AND u.talent_id IS NOT NULL AND u.is_active
      WHERE a.type = 'task' AND a.completed_at IS NULL
        AND (a.due_at AT TIME ZONE ${AGENCY_TIME_ZONE})::date = ${tomorrow}::date
    `;
    await inBatches(rows, (t: any) => notify([t.owner_user_id], taskDue(t, tomorrow)));
    tasks = rows.length;
  }

  return { bookings, tasks, deleted };
}
