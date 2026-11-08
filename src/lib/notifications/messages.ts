/**
 * What each notification says, and what a talent may see in it. The one
 * place these rules live:
 * - a booking only notifies while it's shared with the talent
 * - the client's name only when the booking lets the talent see it
 * - money only in payouts, and only the net that was paid
 * Pure functions, relative imports only (the reminders job uses them).
 */
import { AGENCY_TIME_ZONE, type Booking } from '../bookings/types';
import type { NotificationMessage } from './types';

const TITLE_MAX = 80;
const BODY_MAX = 200;

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function message(m: NotificationMessage): NotificationMessage {
  return { ...m, title: cut(m.title, TITLE_MAX), body: cut(m.body, BODY_MAX) };
}

const ukDay = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: AGENCY_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
const ukTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: AGENCY_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const ukDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: AGENCY_TIME_ZONE, day: 'numeric', month: 'short' }).format(new Date(iso));
/** "Sat 14 Nov, 21:00" */
const when = (iso: string) => `${ukDay(iso)}, ${ukTime(iso)}`;

const BOOKINGS_LINK = '/portal/bookings';

export function taskAssigned(t: { id: string; subject: string; due_at: string | null }): NotificationMessage {
  const due = t.due_at ? ` · due ${ukDate(t.due_at)}` : '';
  // Keep the due date when a long subject is cut
  return message({ kind: 'task_assigned', title: 'New to-do', body: cut(t.subject, BODY_MAX - due.length) + due, link: '/portal' });
}

export function taskDue(t: { id: string; subject: string }, day: string): NotificationMessage {
  return message({ kind: 'task_due', title: 'Due tomorrow', body: t.subject, link: '/portal', dedupeKey: `task_due:${t.id}:${day}` });
}

/** Title, start, and the client only if the talent may see it */
function bookingSummary(b: Booking): string {
  const parts = [b.title, when(b.starts_at)];
  if (b.client_visible_to_talent && b.client?.name) parts.push(b.client.name);
  return parts.join(' · ');
}

function whatChanged(before: Booking, after: Booking): string[] {
  const changes: string[] = [];
  if (before.starts_at !== after.starts_at || before.ends_at !== after.ends_at) {
    changes.push(`New time: ${when(after.starts_at)}–${ukTime(after.ends_at)}`);
  }
  if ((before.location ?? '') !== (after.location ?? '')) changes.push(`New location: ${after.location || 'to be confirmed'}`);
  if ((before.call_time ?? '') !== (after.call_time ?? '')) changes.push(`New call time: ${after.call_time || 'to be confirmed'}`);
  return changes;
}

/**
 * Who to tell about a booking being created (before = null) or saved, and
 * what. At most one notification per talent, picked in this order: moved to
 * another talent, newly shared, cancelled, confirmed, time/place changed.
 */
export function bookingChanges(before: Booking | null, after: Booking): { talentId: string; message: NotificationMessage }[] {
  const out: { talentId: string; message: NotificationMessage }[] = [];
  const shared = (b: Booking | null) => !!b && b.shared_with_talent;
  const talentId = after.talent.id;

  if (before && before.talent.id !== talentId) {
    if (shared(before) && before.status !== 'cancelled') {
      out.push({ talentId: before.talent.id, message: message({ kind: 'booking_cancelled', title: 'Booking cancelled', body: bookingSummary(before), link: BOOKINGS_LINK }) });
    }
    if (shared(after) && after.status !== 'cancelled') {
      out.push({ talentId, message: message({ kind: 'booking_shared', title: 'New booking', body: bookingSummary(after), link: BOOKINGS_LINK }) });
    }
    return out;
  }

  if (!shared(after)) return out;
  const add = (kind: NotificationMessage['kind'], title: string, body: string) =>
    out.push({ talentId, message: message({ kind, title, body, link: BOOKINGS_LINK }) });

  if (!before || !shared(before)) {
    if (after.status !== 'cancelled') add('booking_shared', 'New booking', bookingSummary(after));
  } else if (after.status !== before.status && after.status === 'cancelled') {
    add('booking_cancelled', 'Booking cancelled', bookingSummary(after));
  } else if (after.status !== before.status && after.status === 'confirmed') {
    add('booking_confirmed', 'Booking confirmed', bookingSummary(after));
  } else if (after.status !== 'cancelled') {
    const changes = whatChanged(before, after);
    if (changes.length) add('booking_changed', 'Booking changed', [after.title, ...changes].join(' · '));
  }
  return out;
}

/** The day-before reminder; day = tomorrow's UK date (YYYY-MM-DD) */
export function bookingReminder(b: Pick<Booking, 'id' | 'title' | 'starts_at' | 'location' | 'call_time'>, day: string): NotificationMessage {
  const parts = [b.title, b.call_time ? `Call time ${b.call_time}` : `Starts ${ukTime(b.starts_at)}`];
  if (b.location) parts.push(b.location);
  return message({ kind: 'booking_reminder', title: 'Tomorrow', body: parts.join(' · '), link: BOOKINGS_LINK, dedupeKey: `booking_reminder:${b.id}:${day}` });
}

export function profileReviewed(approved: boolean, note: string | null): NotificationMessage {
  return message({
    kind: 'profile_reviewed',
    title: approved ? 'Profile change approved' : 'Profile change not approved',
    body: note ?? (approved ? 'Your changes are now on your profile.' : ''),
    link: '/portal/profile',
  });
}

export function documentShared(d: { filename: string; booking_id: string | null }): NotificationMessage {
  return message({ kind: 'document_shared', title: 'New document', body: d.filename, link: d.booking_id ? BOOKINGS_LINK : '/portal/profile' });
}

export function payoutPaid(p: { id: string; title: string; paid_cents: number; currency: string; paid_at: string }): NotificationMessage {
  const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: p.currency }).format(p.paid_cents / 100);
  return message({
    kind: 'payout_paid',
    title: 'Payment sent',
    body: `${amount} for ${p.title}`,
    link: '/portal/earnings',
    dedupeKey: `payout_paid:${p.id}:${p.paid_at}`,
  });
}
