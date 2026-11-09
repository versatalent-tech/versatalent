import { test, expect, type APIRequestContext } from '@playwright/test';
import { staffShareCents } from '../../src/lib/bookings/types';
import { createTalent, createTeamUser, sql, uniq } from '../support/db';
import { adminApi, teamApi } from '../support/auth';

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

test.describe('Team rates', () => {
  async function putRates(api: APIRequestContext, rates: { user_id: string; share_percent: number | null }[]) {
    const response = await api.put('/api/team-rates', { data: { rates } });
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json()).data as { people: { id: string; share_percent: number | null; talents: string[] }[]; overLimit: { talent: string; percent: number }[] };
  }

  test('first rate fills in unpaid, uncancelled bookings only', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const finished = await apiBooking(api, talent.id);
    const upcoming = await apiBooking(api, talent.id, { starts_at: new Date(Date.now() + 5 * DAY).toISOString(), ends_at: new Date(Date.now() + 5 * DAY + 3_600_000).toISOString() });
    const cancelled = await apiBooking(api, talent.id, { status: 'cancelled', starts_at: new Date(Date.now() - 8 * DAY).toISOString(), ends_at: new Date(Date.now() - 8 * DAY + 3_600_000).toISOString() });
    const paidToTalent = await apiBooking(api, talent.id, { starts_at: new Date(Date.now() - 10 * DAY).toISOString(), ends_at: new Date(Date.now() - 10 * DAY + 3_600_000).toISOString() });
    await sql`UPDATE bookings SET talent_paid_at = NOW(), talent_paid_cents = 80000 WHERE id = ${paidToTalent}`;

    const data = await putRates(api, [{ user_id: manager.id, share_percent: 10 }]);
    expect(data.people.find((p) => p.id === manager.id)?.share_percent).toBe(10);
    expect((await sharesOf(finished)).get(manager.id)?.percent).toBe(10);
    expect((await sharesOf(upcoming)).get(manager.id)?.percent).toBe(10);
    expect((await sharesOf(cancelled)).size).toBe(0);
    expect((await sharesOf(paidToTalent)).size).toBe(0);
  });

  test('changing a rate later adds nothing and changes nothing', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const first = await apiBooking(api, talent.id);
    await putRates(api, [{ user_id: manager.id, share_percent: 10 }]);
    const [direct] = await sql`
      INSERT INTO bookings (talent_id, title, status, starts_at, ends_at, fee_cents, commission_percent)
      VALUES (${talent.id}, ${uniq('E2E direct')}, 'confirmed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', 100000, 20)
      RETURNING id`;
    await putRates(api, [{ user_id: manager.id, share_percent: 12 }]);
    expect((await sharesOf(first)).get(manager.id)?.percent).toBe(10);
    expect((await sharesOf(direct.id)).size).toBe(0);
  });

  test('over 100% is reported', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const a = await createTeamUser('manager', [talent.id]);
    const b = await createTeamUser('road_manager', [talent.id]);
    const data = await putRates(api, [{ user_id: a.id, share_percent: 60 }, { user_id: b.id, share_percent: 50 }]);
    const [row] = await sql`SELECT name FROM talents WHERE id = ${talent.id}`;
    expect(data.overLimit).toContainEqual({ talent: row.name, percent: 110 });
    expect(data.people.find((p) => p.id === a.id)?.talents).toEqual([row.name]);
  });

  test('only managers and road managers get a rate', async () => {
    const api = await adminApi();
    const talent = await createTalent();
    const [admin] = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    const manager = await createTeamUser('manager', [talent.id]);
    await putRates(api, [{ user_id: admin.id, share_percent: 10 }, { user_id: manager.id, share_percent: 5 }]);
    const [stored] = await sql`SELECT share_percent FROM users WHERE id = ${admin.id}`;
    expect(stored.share_percent).toBeNull();
  });

  test('managers can’t see or set team rates', async () => {
    const manager = await createTeamUser('manager');
    const api = await teamApi(manager.email, manager.password);
    expect((await api.get('/api/team-rates')).status()).toBe(403);
    expect((await api.put('/api/team-rates', { data: { rates: [{ user_id: manager.id, share_percent: 50 }] } })).status()).toBe(403);
  });
});
