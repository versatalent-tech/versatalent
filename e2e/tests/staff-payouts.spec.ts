import { test, expect, type APIRequestContext } from '@playwright/test';
import { staffShareCents } from '../../src/lib/bookings/types';
import { createTalent, createTeamUser, sql, uniq } from '../support/db';
import { adminApi } from '../support/auth';

const DAY = 86_400_000;

/** A confirmed £1,000 booking at 20% commission, made through the API so the real code runs; finished 3 days ago unless overridden */
async function apiBooking(api: APIRequestContext, talentId: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const start = Date.now() - 3 * DAY;
  const response = await api.post('/api/bookings', {
    data: {
      talent_id: talentId,
      title: uniq('E2E Share booking'),
      status: 'confirmed',
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 4 * 3_600_000).toISOString(),
      fee_cents: 100_000,
      commission_percent: 20,
      force: true,
      ...overrides,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).data.id;
}

async function setRate(userId: string, percent: number | null) {
  await sql`UPDATE users SET share_percent = ${percent} WHERE id = ${userId}`;
}

async function sharesOf(bookingId: string) {
  const rows = await sql`SELECT user_id, share_percent, paid_at FROM booking_staff_shares WHERE booking_id = ${bookingId}`;
  return new Map(rows.map((r) => [r.user_id as string, { percent: Number(r.share_percent), paid: r.paid_at !== null }]));
}

test.describe('Share amounts', () => {
  test('£1,000 at 20% commission and a 10% rate is £20.00', () => {
    expect(staffShareCents(100_000, 20, 10)).toBe(2_000);
  });

  test('rounds to the penny from the rounded commission', () => {
    // commission 33,333 × 15% = 4,999.95 → 5,000; × 12.5% = 625
    expect(staffShareCents(33_333, 15, 12.5)).toBe(625);
  });

  test('no fee → null; no commission % or 0% rate → 0', () => {
    expect(staffShareCents(null, 20, 10)).toBeNull();
    expect(staffShareCents(100_000, null, 10)).toBe(0);
    expect(staffShareCents(100_000, 20, 0)).toBe(0);
  });
});

test.describe('Shares on bookings', () => {
  test('a booking gets a share for each rated person linked to the talent', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const road = await createTeamUser('road_manager', [talent.id]);
    const unrated = await createTeamUser('manager', [talent.id]);
    await setRate(manager.id, 10);
    await setRate(road.id, 5);

    const shares = await sharesOf(await apiBooking(api, talent.id));
    expect(shares.size).toBe(2);
    expect(shares.get(manager.id)?.percent).toBe(10);
    expect(shares.get(road.id)?.percent).toBe(5);
    expect(shares.has(unrated.id)).toBe(false);
  });

  test('a rate change later leaves the booking alone; a new booking uses the new rate', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    await setRate(manager.id, 10);
    const a = await apiBooking(api, talent.id);
    await setRate(manager.id, 15);
    const b = await apiBooking(api, talent.id, { starts_at: new Date(Date.now() - 6 * DAY).toISOString(), ends_at: new Date(Date.now() - 6 * DAY + 3_600_000).toISOString() });
    expect((await sharesOf(a)).get(manager.id)?.percent).toBe(10);
    expect((await sharesOf(b)).get(manager.id)?.percent).toBe(15);
  });

  test('deactivated people get no share', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    await setRate(manager.id, 10);
    await sql`UPDATE users SET is_active = false WHERE id = ${manager.id}`;
    expect((await sharesOf(await apiBooking(api, talent.id))).size).toBe(0);
  });

  test('changing the talent moves unpaid shares and keeps paid ones', async () => {
    const api = await adminApi();
    const x = await createTalent();
    const y = await createTalent();
    const both = await createTeamUser('manager', [x.id, y.id]);
    const road = await createTeamUser('road_manager', [x.id]);
    const onlyY = await createTeamUser('manager', [y.id]);
    await setRate(both.id, 10);
    await setRate(road.id, 5);
    await setRate(onlyY.id, 8);
    const id = await apiBooking(api, x.id);
    await sql`UPDATE booking_staff_shares SET paid_at = NOW(), paid_cents = 100 WHERE booking_id = ${id} AND user_id = ${road.id}`;

    const response = await api.patch(`/api/bookings/${id}`, { data: { talent_id: y.id, force: true } });
    expect(response.status(), await response.text()).toBe(200);
    const shares = await sharesOf(id);
    expect(shares.get(road.id)).toEqual({ percent: 5, paid: true });
    expect(shares.get(both.id)).toEqual({ percent: 10, paid: false });
    expect(shares.get(onlyY.id)).toEqual({ percent: 8, paid: false });
    expect(shares.size).toBe(3);
  });

  test('a paid share survives a talent change even if they also look after the new talent', async () => {
    const api = await adminApi();
    const x = await createTalent();
    const y = await createTalent();
    const both = await createTeamUser('manager', [x.id, y.id]);
    await setRate(both.id, 10);
    const id = await apiBooking(api, x.id);
    await sql`UPDATE booking_staff_shares SET paid_at = NOW(), paid_cents = 2000 WHERE booking_id = ${id}`;
    await setRate(both.id, 30);
    const response = await api.patch(`/api/bookings/${id}`, { data: { talent_id: y.id, force: true } });
    expect(response.status(), await response.text()).toBe(200);
    expect((await sharesOf(id)).get(both.id)).toEqual({ percent: 10, paid: true });
  });

  test('deleting a booking removes its shares', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    await setRate(manager.id, 10);
    const id = await apiBooking(api, talent.id);
    expect((await sharesOf(id)).size).toBe(1);
    expect((await api.delete(`/api/bookings/${id}`)).status()).toBe(200);
    expect((await sharesOf(id)).size).toBe(0);
  });
});
