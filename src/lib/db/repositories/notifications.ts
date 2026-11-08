/**
 * Notifications and the devices they're pushed to. Relative imports only:
 * the hourly reminders job (netlify/functions/talent-reminders.mts) uses it.
 */
import { sql } from '../client';
import type { NotificationMessage, PortalNotification, PushDevice } from '../../notifications/types';

/** Save one notification per user; with a dedupeKey, only the first is kept */
export async function saveNotifications(userIds: string[], m: NotificationMessage): Promise<{ id: string; user_id: string }[]> {
  if (userIds.length === 0) return [];
  const rows = await sql`
    INSERT INTO notifications (user_id, kind, title, body, link, dedupe_key)
    SELECT u, ${m.kind}, ${m.title}, ${m.body}, ${m.link},
      -- One key per user when several people get the same reminder
      ${m.dedupeKey ?? null}::text || CASE WHEN ${userIds.length} > 1 THEN ':' || u::text ELSE '' END
    FROM unnest(${userIds}::uuid[]) AS u
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING id, user_id
  `;
  return rows.map((r: any) => ({ id: r.id, user_id: r.user_id }));
}

export async function listNotifications(userId: string, limit = 30): Promise<{ items: PortalNotification[]; unread: number }> {
  const [rows, [count]] = await Promise.all([
    sql`
      SELECT id, kind, title, body, link, read_at, created_at FROM notifications
      WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
    `,
    sql`SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = ${userId} AND read_at IS NULL`,
  ]);
  return {
    items: rows.map((r: any) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      link: r.link,
      read: r.read_at !== null,
      created_at: new Date(r.created_at).toISOString(),
    })),
    unread: count.unread,
  };
}

/** Mark your own notifications read (all of them, or the given ids) */
export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  const rows = await sql`
    UPDATE notifications SET read_at = NOW()
    WHERE user_id = ${userId} AND read_at IS NULL
      ${ids ? sql`AND id = ANY(${ids}::uuid[])` : sql``}
    RETURNING id
  `;
  return rows.length;
}

export async function markPushed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`UPDATE notifications SET pushed_at = NOW() WHERE id = ANY(${ids}::uuid[])`;
}

/** Save a device; a device that was someone else's (shared phone) moves to this user */
export async function savePushDevice(
  userId: string,
  d: { endpoint: string; p256dh: string; auth: string; userAgent: string | null }
): Promise<void> {
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    VALUES (${userId}, ${d.endpoint}, ${d.p256dh}, ${d.auth}, ${d.userAgent})
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent
  `;
}

export async function deletePushDevice(userId: string, endpoint: string): Promise<boolean> {
  const rows = await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint} RETURNING id`;
  return rows.length > 0;
}

/** The push service says this device is gone */
export async function deletePushDeviceByEndpoint(endpoint: string): Promise<void> {
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function listPushDevices(userIds: string[]): Promise<(PushDevice & { user_id: string })[]> {
  if (userIds.length === 0) return [];
  const rows = await sql`
    SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY(${userIds}::uuid[])
  `;
  return rows.map((r: any) => ({ id: r.id, user_id: r.user_id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

export async function touchPushDevice(id: string): Promise<void> {
  await sql`UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = ${id}`;
}

export async function deleteOldNotifications(days = 90): Promise<number> {
  const rows = await sql`DELETE FROM notifications WHERE created_at < NOW() - make_interval(days => ${days}) RETURNING id`;
  return rows.length;
}

/** A talent's portal logins that can receive notifications */
export async function activeTalentUserIds(talentId: string): Promise<string[]> {
  const rows = await sql`
    SELECT id FROM users WHERE talent_id = ${talentId} AND role = 'artist' AND is_active ORDER BY created_at
  `;
  return rows.map((r: any) => r.id);
}

/** Keep only users who are active talents (the only ones notified for now) */
export async function filterTalentUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await sql`
    SELECT id FROM users WHERE id = ANY(${userIds}::uuid[]) AND role = 'artist' AND talent_id IS NOT NULL AND is_active
  `;
  return rows.map((r: any) => r.id);
}

/** The talent who sees a booking's documents: only while the booking is shared with them */
export async function sharedBookingTalentId(bookingId: string): Promise<string | null> {
  const rows = await sql`SELECT talent_id FROM bookings WHERE id = ${bookingId} AND shared_with_talent`;
  return rows[0]?.talent_id ?? null;
}
