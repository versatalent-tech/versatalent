/**
 * Scheduled function: talents' reminders the day before (bookings at 10:00,
 * tasks at 09:00, UK time) and deleting notifications older than 90 days.
 * Runs hourly so the UK hours stay right when the clocks change.
 */
import { runReminders } from '../../src/lib/notifications/reminders';

export default async () => {
  const sent = await runReminders();
  if (sent.bookings || sent.tasks) console.log(`[talent-reminders] ${sent.bookings} booking and ${sent.tasks} task reminder(s)`);
};

export const config = { schedule: '@hourly' };
