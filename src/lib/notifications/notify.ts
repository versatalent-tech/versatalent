/**
 * Tell people something changed: saved for their bell (portal or team), then pushed to
 * their phones. Called after the change itself is saved, so it never throws:
 * a failure is logged, and the notification is still in the bell even if
 * the push didn't go. Relative imports only (the reminders job uses it).
 */
import {
  activeAdmins,
  activeTalentUserIds,
  bookingBasics,
  deletePushDeviceByEndpoint,
  feeRequestContext,
  filterTalentUsers,
  listPushDevices,
  markPushed,
  saveNotifications,
  sharedBookingIds,
  sharedBookingTalentId,
  talentTeam,
  teamRecipients,
  touchPushDevice,
  type TeamRecipient,
} from '../db/repositories/notifications';
import { can } from '../auth/permissions';
import type { Booking } from '../bookings/types';
import { bookingChanges, documentShared, payoutPaid, taskAssigned } from './messages';
import { pushConfigured, sendPush } from './push';
import {
  TEAM_LINKS,
  bookingResponse,
  enquiryReceived,
  feeRequestDecided,
  feeRequestWaiting,
  profileSubmitted,
  teamBookingChanges,
  teamTaskAssigned,
  timeOffAdded,
} from './team-messages';
import type { NotificationMessage } from './types';

export async function notify(userIds: string[], m: NotificationMessage): Promise<void> {
  try {
    const saved = await saveNotifications(userIds, m);
    if (saved.length === 0 || !pushConfigured()) return;

    const devices = await listPushDevices(saved.map((s) => s.user_id));
    const delivered = new Set<string>();
    await Promise.all(
      devices.map(async (device) => {
        const result = await sendPush(device, { title: m.title, body: m.body, link: m.link });
        if (result === 'sent') {
          delivered.add(device.user_id);
          await touchPushDevice(device.id);
        } else if (result === 'gone') {
          await deletePushDeviceByEndpoint(device.endpoint);
        }
      })
    );
    await markPushed(saved.filter((s) => delivered.has(s.user_id)).map((s) => s.id));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** Notify a talent's portal login, if they have an active one */
export async function notifyTalent(talentId: string, m: NotificationMessage): Promise<void> {
  try {
    await notify(await activeTalentUserIds(talentId), m);
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** Where a team member finds their tasks: the CRM list, or the dashboard for road managers */
export function teamTaskLink(role: TeamRecipient['role']): string {
  return can(role, 'crm.view') ? TEAM_LINKS.tasks : TEAM_LINKS.dashboard;
}

/** Tell team members (each once, never the person who made the change) */
async function notifyTeam(recipients: TeamRecipient[], actorUserId: string | null, m: NotificationMessage): Promise<void> {
  const ids = [...new Set(recipients.map((r) => r.id))].filter((id) => id !== actorUserId);
  await notify(ids, m);
}

/** A task was given to someone other than the person adding it: tell them (talent or team member) */
export async function notifyTaskAssigned(
  task: { id: string; subject: string; due_at: string | null; owner_user_id: string | null },
  actorUserId: string | null
): Promise<void> {
  if (!task.owner_user_id || task.owner_user_id === actorUserId) return;
  try {
    const talents = await filterTalentUsers([task.owner_user_id]);
    if (talents.length > 0) return await notify(talents, taskAssigned(task));
    const [member] = await teamRecipients([task.owner_user_id]);
    if (member) await notify([member.id], teamTaskAssigned(task, teamTaskLink(member.role)));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/**
 * A booking was created (before = null) or saved: tell the talents it affects,
 * and their managers and road managers (except whoever saved it)
 */
export async function notifyBookingChanges(before: Booking | null, after: Booking | null, actorUserId: string | null = null): Promise<void> {
  if (!after) return;
  try {
    await Promise.allSettled([
      ...bookingChanges(before, after).map(({ talentId, message }) => notifyTalent(talentId, message)),
      ...teamBookingChanges(before, after).map(async ({ talentId, message }) =>
        notifyTeam(await talentTeam(talentId, ['manager', 'road_manager']), actorUserId, message)
      ),
    ]);
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** Payouts recorded: tell each talent, for bookings they can see in the portal, all at once */
export async function notifyPayouts(
  paid: { id: string; title: string; talent_id: string; paid_cents: number; currency: string; paid_at: string }[]
): Promise<void> {
  try {
    const shared = await sharedBookingIds(paid.map((p) => p.id));
    await Promise.allSettled(
      paid.filter((p) => shared.has(p.id)).map(async (p) => notifyTalent(p.talent_id, payoutPaid(p)))
    );
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** A document became visible to a talent: on their profile, or on a booking shared with them */
export async function notifyDocumentShared(doc: { booking_id: string | null; talent_id: string | null; filename: string }): Promise<void> {
  try {
    const talentId = doc.talent_id ?? (doc.booking_id ? await sharedBookingTalentId(doc.booking_id) : null);
    if (talentId) await notifyTalent(talentId, documentShared(doc));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Team notifications
// ---------------------------------------------------------------------------

/** A talent accepted or declined a booking in the portal: admins and the talent's team */
export async function notifyBookingResponse(
  talent: { talentId: string; talentName: string },
  bookingId: string,
  response: 'accepted' | 'declined',
  note: string | null
): Promise<void> {
  try {
    const booking = await bookingBasics(bookingId);
    if (!booking) return;
    const [admins, team] = await Promise.all([activeAdmins(), talentTeam(talent.talentId, ['manager', 'road_manager'])]);
    await notifyTeam([...admins, ...team], null, bookingResponse(booking, talent.talentName, response, note));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** A talent added time off in the portal: their managers and road managers */
export async function notifyTimeOff(
  talent: { talentId: string; talentName: string },
  data: { starts_on: string; ends_on: string; kind: 'unavailable' | 'tentative'; note: string | null }
): Promise<void> {
  try {
    await notifyTeam(await talentTeam(talent.talentId, ['manager', 'road_manager']), null, timeOffAdded(talent.talentName, data));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** A talent sent profile changes for approval: admins */
export async function notifyProfileSubmitted(talentName: string, fields: string[]): Promise<void> {
  try {
    await notifyTeam(await activeAdmins(), null, profileSubmitted(talentName, fields));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** A manager's fee change is waiting: admins */
export async function notifyFeeRequestWaiting(requestId: string, actorUserId: string | null): Promise<void> {
  try {
    const ctx = await feeRequestContext(requestId);
    if (!ctx) return;
    await notifyTeam(await activeAdmins(), actorUserId, feeRequestWaiting(ctx, ctx.requestedByName));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** An admin approved or rejected a fee change: the team member who asked */
export async function notifyFeeRequestDecided(
  requestId: string,
  approved: boolean,
  note: string | null,
  actorUserId: string | null
): Promise<void> {
  try {
    const ctx = await feeRequestContext(requestId);
    if (!ctx?.requestedBy) return;
    await notifyTeam(await teamRecipients([ctx.requestedBy]), actorUserId, feeRequestDecided(ctx, approved, note));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

/** A website enquiry came in: admins, plus the managers of the talent it's about */
export async function notifyEnquiry(e: { form: string; name: string; subject: string | null; talent_id: string | null }): Promise<void> {
  try {
    const [admins, managers] = await Promise.all([activeAdmins(), e.talent_id ? talentTeam(e.talent_id, ['manager']) : []]);
    await notifyTeam([...admins, ...managers], null, enquiryReceived(e));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}
