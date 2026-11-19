import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTalent, createTalentLogin, createTeamUser, sql, uniq } from '../support/db';
import { adminApi, anonymousApi, portalApi, teamApi } from '../support/auth';
import { saveNotifications } from '../../src/lib/db/repositories/notifications';
import { runReminders } from '../../src/lib/notifications/reminders';
import { teamBookingChanges } from '../../src/lib/notifications/team-messages';
import type { Booking } from '../../src/lib/bookings/types';

/**
 * Team notifications: admins, managers and road managers get their own bell
 * on the admin pages, for the events that matter to their role. The admin
 * the tests sign in as is the env-configured one (no user row), so admins
 * who should be told are made as real accounts here.
 */

const DAY = 86_400_000;

type Row = { kind: string; title: string; body: string; link: string | null };

async function notificationsFor(userId: string): Promise<Row[]> {
  return (await sql`SELECT kind, title, body, link FROM notifications WHERE user_id = ${userId} ORDER BY created_at, id`) as Row[];
}

/** A talent with a portal login, a manager and a road manager assigned to them, and an admin account */
async function team() {
  const talent = await createTalent();
  const login = await createTalentLogin(talent.id);
  const manager = await createTeamUser('manager', [talent.id]);
  const roadManager = await createTeamUser('road_manager', [talent.id]);
  const otherManager = await createTeamUser('manager');
  const admin = await createTeamUser('admin');
  return { talent, login, manager, roadManager, otherManager, admin };
}

async function newBooking(api: APIRequestContext, talentId: string, extra: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + (30 + Math.random() * 300) * DAY);
  start.setUTCHours(20, 0, 0, 0);
  const res = await api.post('/api/bookings', {
    data: {
      talent_id: talentId,
      title: uniq('E2E Team gig'),
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 4 * 3_600_000).toISOString(),
      fee_cents: 150_000,
      force: true,
      ...extra,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).data as { id: string; title: string };
}

test.describe('Who hears about what', () => {
  test('tasks: the team member given it, with a link they can open; never yourself', async () => {
    const { manager, roadManager } = await team();
    const admin = await adminApi();
    const forRoad = uniq('Load the van');
    const forManager = uniq('Call the venue');
    for (const [owner, subject] of [[roadManager.id, forRoad], [manager.id, forManager]]) {
      const res = await admin.post('/api/crm/activities', { data: { type: 'task', subject, due_at: new Date(Date.now() + DAY).toISOString(), owner_user_id: owner } });
      expect(res.status(), await res.text()).toBe(201);
    }
    expect(await notificationsFor(roadManager.id)).toEqual([
      expect.objectContaining({ kind: 'task_assigned', title: 'New task for you', body: expect.stringContaining(forRoad), link: '/admin' }),
    ]);
    expect(await notificationsFor(manager.id)).toEqual([
      expect.objectContaining({ kind: 'task_assigned', body: expect.stringContaining(forManager), link: '/admin/crm/tasks' }),
    ]);

    // A manager's task for themself: nothing
    const managerApi = await teamApi(manager.email, manager.password);
    const own = await managerApi.post('/api/crm/activities', { data: { type: 'task', subject: uniq('Mine'), due_at: new Date(Date.now() + DAY).toISOString(), owner_user_id: manager.id } });
    expect(own.status(), await own.text()).toBe(201);
    expect(await notificationsFor(manager.id)).toHaveLength(1);
  });

  test('bookings: the talent’s manager and road manager, not other managers or admins; no fees in the message', async () => {
    const { talent, manager, roadManager, otherManager, admin } = await team();
    const api = await adminApi();
    const booking = await newBooking(api, talent.id, { status: 'hold' });
    await api.patch(`/api/bookings/${booking.id}`, { data: { status: 'confirmed', force: true } });
    await api.patch(`/api/bookings/${booking.id}`, { data: { location: 'Leeds' } }); // nothing to tell
    await api.patch(`/api/bookings/${booking.id}`, { data: { status: 'cancelled', force: true } });

    for (const member of [manager, roadManager]) {
      const rows = await notificationsFor(member.id);
      expect(rows.map((r) => r.title)).toEqual(['New booking', 'Booking confirmed', 'Booking cancelled']);
      for (const r of rows) {
        expect(r.body).toContain(booking.title);
        expect(r.body).not.toMatch(/£|1,500/);
        expect(r.link).toBe('/admin/bookings');
      }
    }
    expect(await notificationsFor(otherManager.id)).toEqual([]);
    expect(await notificationsFor(admin.id)).toEqual([]);
  });

  test('bookings: whoever made the change isn’t told about it', async () => {
    const { talent, manager, roadManager } = await team();
    const managerApi = await teamApi(manager.email, manager.password);
    await newBooking(managerApi, talent.id, { fee_cents: null });
    expect(await notificationsFor(manager.id)).toEqual([]);
    expect((await notificationsFor(roadManager.id)).map((r) => r.title)).toEqual(['New booking']);
  });

  test('talent answers a booking: admins and the talent’s team', async () => {
    const { talent, login, manager, roadManager, otherManager, admin } = await team();
    const booking = await newBooking(await adminApi(), talent.id, { status: 'confirmed', shared_with_talent: true });
    const portal = await portalApi(login.email, login.password);
    const res = await portal.post(`/api/portal/bookings/${booking.id}/respond`, { data: { response: 'declined', note: 'Away that week' } });
    expect(res.status(), await res.text()).toBe(200);

    for (const member of [admin, manager, roadManager]) {
      const answered = (await notificationsFor(member.id)).filter((r) => r.kind === 'booking_response');
      expect(answered).toEqual([
        expect.objectContaining({ title: expect.stringContaining('declined a booking'), body: expect.stringContaining('Away that week'), link: '/admin/bookings' }),
      ]);
      expect(answered[0].body).toContain(booking.title);
    }
    expect(await notificationsFor(otherManager.id)).toEqual([]);
  });

  test('talent adds time off: their manager and road manager only', async () => {
    const { login, manager, roadManager, admin } = await team();
    const portal = await portalApi(login.email, login.password);
    const res = await portal.post('/api/portal/availability', { data: { starts_on: '2027-06-01', ends_on: '2027-06-03', note: 'Holiday' } });
    expect(res.status(), await res.text()).toBe(201);
    for (const member of [manager, roadManager]) {
      expect(await notificationsFor(member.id)).toEqual([
        expect.objectContaining({ kind: 'time_off_added', title: expect.stringContaining('added time off'), body: expect.stringContaining('1 Jun – 3 Jun') }),
      ]);
    }
    expect(await notificationsFor(admin.id)).toEqual([]);
  });

  test('talent sends a profile change: admins, not managers', async () => {
    const { talent, login, manager, admin } = await team();
    const portal = await portalApi(login.email, login.password);
    const res = await portal.post('/api/portal/profile', { data: { changes: { tagline: uniq('New tagline') } } });
    expect(res.status(), await res.text()).toBe(201);
    expect(await notificationsFor(admin.id)).toEqual([
      expect.objectContaining({ kind: 'profile_submitted', title: 'Profile change to review', body: expect.stringContaining('tagline'), link: '/admin/talent-portal' }),
    ]);
    expect(await notificationsFor(manager.id)).toEqual([]);
    await sql`UPDATE talent_profile_changes SET status = 'withdrawn' WHERE talent_id = ${talent.id}`;
  });

  test('fee change: admins are asked; the manager hears the decision', async () => {
    const { talent, manager, roadManager, admin } = await team();
    const api = await adminApi();
    const booking = await newBooking(api, talent.id, { status: 'confirmed' });
    const managerApi = await teamApi(manager.email, manager.password);
    const res = await managerApi.patch(`/api/bookings/${booking.id}`, { data: { fee_cents: 180_000 } });
    expect(res.status(), await res.text()).toBe(200);

    const asked = (await notificationsFor(admin.id)).filter((r) => r.kind === 'fee_request_waiting');
    expect(asked).toEqual([expect.objectContaining({ title: 'Fee change to approve', link: '/admin/bookings/fee-approvals' })]);
    expect(asked[0].body).toContain(booking.title);
    expect(asked[0].body).not.toMatch(/£|1,800/);
    expect((await notificationsFor(roadManager.id)).some((r) => r.kind.startsWith('fee_'))).toBe(false);

    const [request] = await sql`SELECT id FROM booking_fee_requests WHERE booking_id = ${booking.id} AND status = 'pending'`;
    const decided = await api.post(`/api/bookings/fee-requests/${request.id}`, { data: { decision: 'reject', note: 'Keep the agreed fee' } });
    expect(decided.status(), await decided.text()).toBe(200);
    expect((await notificationsFor(manager.id)).filter((r) => r.kind === 'fee_request_decided')).toEqual([
      expect.objectContaining({ title: 'Fee change not approved', body: expect.stringContaining('Keep the agreed fee') }),
    ]);
  });

  test('website enquiry about a talent: admins and that talent’s managers', async () => {
    const { talent, manager, roadManager, otherManager, admin } = await team();
    const visitor = await anonymousApi();
    const name = uniq('E2E Visitor');
    const res = await visitor.post('/api/enquiries', {
      headers: { 'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
      data: { formName: 'versatalent-booking', fields: { name, email: `${uniq('visitor')}@example.com`, talentId: talent.id, message: 'Wedding in June' } },
    });
    expect(res.status(), await res.text()).toBe(201);
    for (const member of [admin, manager]) {
      expect(await notificationsFor(member.id)).toEqual([
        expect.objectContaining({ kind: 'enquiry_received', title: 'New booking enquiry', body: expect.stringContaining(name), link: '/admin/crm/enquiries' }),
      ]);
    }
    expect(await notificationsFor(roadManager.id)).toEqual([]);
    expect(await notificationsFor(otherManager.id)).toEqual([]);
  });

  test('task due tomorrow: team members reminded at 09:00 with their task link', async () => {
    const { manager, roadManager } = await team();
    const a = uniq('Send the rider');
    const b = uniq('Book the hotel');
    await sql`INSERT INTO activities (type, subject, due_at, owner_user_id) VALUES ('task', ${a}, '2027-04-15T16:00:00Z', ${manager.id})`;
    await sql`INSERT INTO activities (type, subject, due_at, owner_user_id) VALUES ('task', ${b}, '2027-04-15T16:00:00Z', ${roadManager.id})`;
    await runReminders(new Date('2027-04-14T08:05:00Z')); // 09:05 BST
    await runReminders(new Date('2027-04-14T08:45:00Z'));
    expect(await notificationsFor(manager.id)).toEqual([expect.objectContaining({ kind: 'task_due', title: 'Task due tomorrow', body: a, link: '/admin/crm/tasks' })]);
    expect(await notificationsFor(roadManager.id)).toEqual([expect.objectContaining({ kind: 'task_due', body: b, link: '/admin' })]);
  });

  test('moving a booking to another talent tells both teams', () => {
    const base = { id: randomUUID(), title: 'Gig', status: 'confirmed', starts_at: '2027-05-01T19:00:00Z', ends_at: '2027-05-01T23:00:00Z' };
    const before = { ...base, talent: { id: 'a', name: 'Ana' } } as unknown as Booking;
    const after = { ...base, talent: { id: 'b', name: 'Ben' } } as unknown as Booking;
    expect(teamBookingChanges(before, after).map((c) => [c.talentId, c.message.title])).toEqual([
      ['a', 'Booking moved to another talent'],
      ['b', 'New booking'],
    ]);
  });
});

test.describe('Team bell API', () => {
  test('lists and marks only your own; others are turned away', async () => {
    const { manager, roadManager, login } = await team();
    const [mine] = await saveNotifications([manager.id], { kind: 'task_assigned', title: 'New task for you', body: uniq('Mine'), link: '/admin' });
    const [theirs] = await saveNotifications([roadManager.id], { kind: 'task_assigned', title: 'New task for you', body: uniq('Theirs'), link: '/admin' });

    const managerApi = await teamApi(manager.email, manager.password);
    const list = await (await managerApi.get('/api/admin/notifications')).json();
    expect(list.data.unread).toBe(1);
    expect(list.data.items.map((n: { id: string }) => n.id)).toEqual([mine.id]);

    await managerApi.post('/api/admin/notifications/read', { data: { ids: [theirs.id] } });
    expect((await sql`SELECT read_at FROM notifications WHERE id = ${theirs.id}`)[0].read_at).toBeNull();
    await managerApi.post('/api/admin/notifications/read', { data: {} });
    expect((await (await managerApi.get('/api/admin/notifications')).json()).data.unread).toBe(0);

    const anonymous = await anonymousApi();
    expect((await anonymous.get('/api/admin/notifications')).status()).toBe(401);
    const portal = await portalApi(login.email, login.password);
    expect((await portal.get('/api/admin/notifications')).status()).toBe(401);
  });

  test('the env admin (no account row) gets an empty list', async () => {
    const admin = await adminApi();
    const res = await admin.get('/api/admin/notifications');
    expect(res.status()).toBe(200);
    expect((await res.json()).data).toEqual({ items: [], unread: 0 });
  });
});

test.describe('Team bell on the admin pages', () => {
  test('shows the unread count, opens, clears, and links to the full list', async ({ page }) => {
    const { roadManager } = await team();
    for (let i = 0; i < 2; i++) {
      await saveNotifications([roadManager.id], { kind: 'booking_shared', title: 'New booking', body: uniq('Gig'), link: '/admin/bookings' });
    }
    const api = await teamApi(roadManager.email, roadManager.password);
    await page.context().addCookies((await api.storageState()).cookies);
    await page.goto('/admin');

    const corner = page.getByTestId('team-notification-bell');
    const bell = corner.getByRole('button', { name: /Notifications/ });
    await expect(bell).toContainText('2');
    await bell.click();
    await expect(corner.getByText('New booking')).toHaveCount(2);
    await expect(bell).not.toContainText('2');
    await expect.poll(async () => (await (await api.get('/api/admin/notifications')).json()).data.unread).toBe(0);

    await corner.getByRole('link', { name: 'See all notifications' }).click();
    await expect(page).toHaveURL(/\/admin\/notifications$/);
    await expect(page.getByTestId('team-notifications').getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText('All read', { exact: true })).toBeVisible();
  });

  test('the full list marks all read', async ({ page }) => {
    const { manager } = await team();
    await saveNotifications([manager.id], { kind: 'task_assigned', title: 'New task for you', body: uniq('Call back'), link: '/admin/crm/tasks' });
    const api = await teamApi(manager.email, manager.password);
    await page.context().addCookies((await api.storageState()).cookies);
    await page.goto('/admin/notifications');
    await expect(page.getByText('1 unread')).toBeVisible();
    await page.getByRole('button', { name: 'Mark all read' }).click();
    await expect(page.getByText('All read', { exact: true })).toBeVisible();
  });
});
