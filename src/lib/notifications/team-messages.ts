/**
 * What team notifications say (admins, managers, road managers). Road
 * managers see none of the money or client details, so no team message
 * carries either: fees stay on the approvals page, clients on the booking.
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
/** "14 Nov" or "14 Nov – 16 Nov" for YYYY-MM-DD days */
const dayRange = (from: string, to: string) => {
  const day = (d: string) => ukDate(`${d}T12:00:00Z`);
  return from === to ? day(from) : `${day(from)} – ${day(to)}`;
};

export const TEAM_LINKS = {
  dashboard: '/admin',
  tasks: '/admin/crm/tasks',
  bookings: '/admin/bookings',
  feeApprovals: '/admin/bookings/fee-approvals',
  talentPortal: '/admin/talent-portal',
  enquiries: '/admin/crm/enquiries',
} as const;

/** taskLink: the CRM task list for those who can open it, else the dashboard (road managers' "Your tasks") */
export function teamTaskAssigned(t: { subject: string; due_at: string | null }, taskLink: string): NotificationMessage {
  const due = t.due_at ? ` · due ${ukDate(t.due_at)}` : '';
  return message({ kind: 'task_assigned', title: 'New task for you', body: cut(t.subject, BODY_MAX - due.length) + due, link: taskLink });
}

export function teamTaskDue(t: { id: string; subject: string }, day: string, taskLink: string): NotificationMessage {
  return message({ kind: 'task_due', title: 'Task due tomorrow', body: t.subject, link: taskLink, dedupeKey: `task_due:${t.id}:${day}` });
}

const bookingLine = (b: Pick<Booking, 'title' | 'starts_at' | 'talent'>) => [b.talent.name, b.title, when(b.starts_at)].join(' · ');

/**
 * What the talent's team hears about a booking being created (before = null)
 * or saved. At most one message per talent's team: moved to another talent,
 * new, cancelled, confirmed, rescheduled. Unlike the talent's own
 * notifications this doesn't wait for the booking to be shared.
 */
export function teamBookingChanges(before: Booking | null, after: Booking): { talentId: string; message: NotificationMessage }[] {
  const link = TEAM_LINKS.bookings;
  const out: { talentId: string; message: NotificationMessage }[] = [];
  const add = (talentId: string, kind: NotificationMessage['kind'], title: string, body: string) =>
    out.push({ talentId, message: message({ kind, title, body, link }) });

  if (!before) {
    if (after.status !== 'cancelled') add(after.talent.id, 'booking_shared', 'New booking', bookingLine(after));
    return out;
  }
  if (before.talent.id !== after.talent.id) {
    if (before.status !== 'cancelled') {
      add(before.talent.id, 'booking_cancelled', 'Booking moved to another talent', `${bookingLine(before)} · now ${after.talent.name}`);
    }
    if (after.status !== 'cancelled') add(after.talent.id, 'booking_shared', 'New booking', bookingLine(after));
    return out;
  }
  if (after.status !== before.status && after.status === 'cancelled') {
    add(after.talent.id, 'booking_cancelled', 'Booking cancelled', bookingLine(after));
  } else if (after.status !== before.status && after.status === 'confirmed') {
    add(after.talent.id, 'booking_confirmed', 'Booking confirmed', bookingLine(after));
  } else if (after.status !== 'cancelled' && (before.starts_at !== after.starts_at || before.ends_at !== after.ends_at)) {
    add(after.talent.id, 'booking_changed', 'Booking rescheduled', `${bookingLine(after)}–${ukTime(after.ends_at)}`);
  }
  return out;
}

export function bookingResponse(
  b: { title: string; starts_at: string },
  talentName: string,
  response: 'accepted' | 'declined',
  note: string | null
): NotificationMessage {
  const parts = [b.title, when(b.starts_at)];
  if (note) parts.push(`“${note}”`);
  return message({
    kind: 'booking_response',
    title: `${talentName} ${response} a booking`,
    body: parts.join(' · '),
    link: TEAM_LINKS.bookings,
  });
}

export function timeOffAdded(
  talentName: string,
  a: { starts_on: string; ends_on: string; kind: 'unavailable' | 'tentative'; note: string | null }
): NotificationMessage {
  const parts = [dayRange(a.starts_on, a.ends_on), a.kind === 'tentative' ? 'Maybe available' : 'Unavailable'];
  if (a.note) parts.push(a.note);
  return message({ kind: 'time_off_added', title: `${talentName} added time off`, body: parts.join(' · '), link: TEAM_LINKS.bookings });
}

export function profileSubmitted(talentName: string, fields: string[]): NotificationMessage {
  return message({
    kind: 'profile_submitted',
    title: 'Profile change to review',
    body: `${talentName}: ${fields.map((f) => f.replace('_', ' ')).join(', ')}`,
    link: TEAM_LINKS.talentPortal,
  });
}

export function feeRequestWaiting(b: { title: string; talentName: string }, requestedBy: string | null): NotificationMessage {
  return message({
    kind: 'fee_request_waiting',
    title: 'Fee change to approve',
    body: [b.talentName, b.title, requestedBy ? `from ${requestedBy}` : null].filter(Boolean).join(' · '),
    link: TEAM_LINKS.feeApprovals,
  });
}

export function feeRequestDecided(b: { title: string; talentName: string }, approved: boolean, note: string | null): NotificationMessage {
  return message({
    kind: 'fee_request_decided',
    title: approved ? 'Fee change approved' : 'Fee change not approved',
    body: [b.talentName, b.title, note].filter(Boolean).join(' · '),
    link: TEAM_LINKS.bookings,
  });
}

export function enquiryReceived(e: { form: string; name: string; subject: string | null }): NotificationMessage {
  const label =
    e.form === 'booking' ? 'New booking enquiry' : e.form === 'talent' ? 'New talent application' : e.form === 'brand' ? 'New brand enquiry' : 'New enquiry';
  return message({ kind: 'enquiry_received', title: label, body: [e.name, e.subject].filter(Boolean).join(' · '), link: TEAM_LINKS.enquiries });
}
