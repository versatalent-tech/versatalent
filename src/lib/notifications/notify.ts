/**
 * Tell people something changed: saved for the portal bell, then pushed to
 * their phones. Called after the change itself is saved, so it never throws:
 * a failure is logged, and the notification is still in the bell even if
 * the push didn't go. Relative imports only (the reminders job uses it).
 */
import {
  activeTalentUserIds,
  deletePushDeviceByEndpoint,
  filterTalentUsers,
  listPushDevices,
  markPushed,
  saveNotifications,
  touchPushDevice,
} from '../db/repositories/notifications';
import { taskAssigned } from './messages';
import { pushConfigured, sendPush } from './push';
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

/** A task was given to someone other than the person adding it: tell them if they're a talent */
export async function notifyTaskAssigned(
  task: { id: string; subject: string; due_at: string | null; owner_user_id: string | null },
  actorUserId: string | null
): Promise<void> {
  if (!task.owner_user_id || task.owner_user_id === actorUserId) return;
  try {
    await notify(await filterTalentUsers([task.owner_user_id]), taskAssigned(task));
  } catch (error) {
    console.error('Notification failed:', error);
  }
}
