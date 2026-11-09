import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTalent, createTalentLogin, createTeamUser, sql, uniq } from '../support/db';
import { adminApi, teamApi } from '../support/auth';

/**
 * A manager's change to a booking's fee, commission or currency waits for an
 * admin to approve it; admins' own changes apply straight away.
 */
const DAY = 86_400_000;

async function apiBooking(api: APIRequestContext, talentId: string, overrides: Record<string, unknown> = {}) {
  const start = Date.now() - 3 * DAY;
  const response = await api.post('/api/bookings', {
    data: {
      talent_id: talentId,
      title: uniq('E2E Fee booking'),
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
  return (await response.json()) as { data: { id: string }; message: string };
}

async function setup() {
  const admin = await adminApi();
  const talent = await createTalent();
  await sql`UPDATE talents SET commission_percent = 20 WHERE id = ${talent.id}`;
  const manager = await createTeamUser('manager', [talent.id]);
  const managerApi = await teamApi(manager.email, manager.password);
  const { data } = await apiBooking(admin, talent.id);
  return { admin, talent, manager, managerApi, bookingId: data.id };
}

async function bookingMoney(id: string) {
  const [b] = await sql`SELECT fee_cents, commission_percent, currency, location, title FROM bookings WHERE id = ${id}`;
  return { ...b, commission_percent: b.commission_percent === null ? null : Number(b.commission_percent) };
}

async function requestsFor(id: string) {
  const rows = await sql`SELECT status, fee_cents, commission_percent, currency FROM booking_fee_requests WHERE booking_id = ${id} ORDER BY created_at`;
  return rows.map((r) => ({ ...r, commission_percent: r.commission_percent === null ? null : Number(r.commission_percent) }));
}

test.describe('Held changes', () => {
  test('a manager’s fee change is held; other fields apply', async () => {
    const { managerApi, bookingId } = await setup();
    const response = await managerApi.patch(`/api/bookings/${bookingId}`, { data: { fee_cents: 120_000, commission_percent: 25, location: 'Leeds' } });
    expect(response.status(), await response.text()).toBe(200);
    expect((await response.json()).message).toContain('waiting for approval');
    expect(await bookingMoney(bookingId)).toMatchObject({ fee_cents: 100_000, commission_percent: 20, location: 'Leeds' });
    expect(await requestsFor(bookingId)).toEqual([{ status: 'pending', fee_cents: 120_000, commission_percent: 25, currency: 'GBP' }]);
  });

  test('a money-only change sends no booking notification', async () => {
    const { talent, managerApi, bookingId } = await setup();
    const login = await createTalentLogin(talent.id);
    const before = await sql`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${login.id}`;
    expect((await managerApi.patch(`/api/bookings/${bookingId}`, { data: { fee_cents: 120_000 } })).status()).toBe(200);
    const after = await sql`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${login.id}`;
    expect(after[0].n).toBe(before[0].n);
  });

  test('re-saving with the same money makes no request', async () => {
    const { managerApi, bookingId } = await setup();
    const response = await managerApi.patch(`/api/bookings/${bookingId}`, {
      data: { fee_cents: 100_000, commission_percent: 20, currency: 'GBP', title: 'E2E Renamed' },
    });
    expect(response.status()).toBe(200);
    expect(await requestsFor(bookingId)).toEqual([]);
    expect((await bookingMoney(bookingId)).title).toBe('E2E Renamed');
  });

  test('a second change replaces the pending request; changing back withdraws it', async () => {
    const { managerApi, bookingId } = await setup();
    await managerApi.patch(`/api/bookings/${bookingId}`, { data: { fee_cents: 120_000 } });
    await managerApi.patch(`/api/bookings/${bookingId}`, { data: { fee_cents: 130_000 } });
    expect(await requestsFor(bookingId)).toEqual([{ status: 'pending', fee_cents: 130_000, commission_percent: 20, currency: 'GBP' }]);
    await managerApi.patch(`/api/bookings/${bookingId}`, { data: { fee_cents: 100_000 } });
    expect((await requestsFor(bookingId)).map((r) => r.status)).toEqual(['withdrawn']);
  });

  test('a manager’s new booking starts with no fee and a request', async () => {
    const { talent, managerApi } = await setup();
    const withFee = await apiBooking(managerApi, talent.id, { fee_cents: 50_000, commission_percent: 30, starts_at: new Date(Date.now() + 5 * DAY).toISOString(), ends_at: new Date(Date.now() + 5 * DAY + 3_600_000).toISOString() });
    expect(withFee.message).toContain('waiting for approval');
    expect(await bookingMoney(withFee.data.id)).toMatchObject({ fee_cents: null, commission_percent: 20 });
    expect(await requestsFor(withFee.data.id)).toEqual([{ status: 'pending', fee_cents: 50_000, commission_percent: 30, currency: 'GBP' }]);

    const noFee = await apiBooking(managerApi, talent.id, { fee_cents: null, commission_percent: 20, starts_at: new Date(Date.now() + 8 * DAY).toISOString(), ends_at: new Date(Date.now() + 8 * DAY + 3_600_000).toISOString() });
    expect(await requestsFor(noFee.data.id)).toEqual([]);
  });

  test('an admin’s change applies straight away', async () => {
    const { admin, bookingId } = await setup();
    expect((await admin.patch(`/api/bookings/${bookingId}`, { data: { fee_cents: 150_000 } })).status()).toBe(200);
    expect((await bookingMoney(bookingId)).fee_cents).toBe(150_000);
    expect(await requestsFor(bookingId)).toEqual([]);
  });
});
