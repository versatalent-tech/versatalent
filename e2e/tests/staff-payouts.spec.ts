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

test.describe('Team payouts', () => {
  type Row = { booking_id: string; user_id: string; amount_cents: number; currency: string; paid_cents: number | null; paid_reference: string | null };
  const daysAgo = (n: number) => ({ starts_at: new Date(Date.now() - n * DAY).toISOString(), ends_at: new Date(Date.now() - n * DAY + 3_600_000).toISOString() });
  const inDays = (n: number) => ({ starts_at: new Date(Date.now() + n * DAY).toISOString(), ends_at: new Date(Date.now() + n * DAY + 3_600_000).toISOString() });

  async function list(api: APIRequestContext, view: 'owed' | 'paid'): Promise<Row[]> {
    const response = await api.get(`/api/payouts/team?view=${view}`);
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json()).data;
  }
  const find = (rows: Row[], bookingId: string, userId: string) => rows.find((r) => r.booking_id === bookingId && r.user_id === userId);
  async function pay(api: APIRequestContext, shares: { booking_id: string; user_id: string }[], reference = 'BACS 1') {
    const response = await api.post('/api/payouts/team/paid', { data: { shares, paid_on: new Date().toISOString().slice(0, 10), reference } });
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json()).data as Row[];
  }
  async function rated(rate = 10) {
    const talent = await createTalent();
    const person = await createTeamUser('manager', [talent.id]);
    await setRate(person.id, rate);
    return { talent, person };
  }

  test('owed lists finished shares with an amount', async () => {
    const api = await adminApi();
    const { talent, person } = await rated();
    const zero = await createTeamUser('road_manager', [talent.id]);
    await setRate(zero.id, 0);
    const finished = await apiBooking(api, talent.id);
    const upcoming = await apiBooking(api, talent.id, inDays(5));
    const cancelled = await apiBooking(api, talent.id, { status: 'cancelled', ...daysAgo(6) });
    const noFee = await apiBooking(api, talent.id, { fee_cents: null, ...daysAgo(8) });
    const noCommission = await apiBooking(api, talent.id, { commission_percent: null, ...daysAgo(10) });

    const owed = await list(api, 'owed');
    expect(find(owed, finished, person.id)).toMatchObject({ amount_cents: 2000, currency: 'GBP' });
    for (const id of [upcoming, cancelled, noFee, noCommission]) expect(find(owed, id, person.id)).toBeUndefined();
    expect(find(owed, finished, zero.id)).toBeUndefined();
  });

  test('mixed currencies stay separate', async () => {
    const api = await adminApi();
    const { talent, person } = await rated();
    const gbp = await apiBooking(api, talent.id);
    const eur = await apiBooking(api, talent.id, { currency: 'EUR', fee_cents: 50_000, ...daysAgo(6) });
    const owed = await list(api, 'owed');
    expect(find(owed, gbp, person.id)).toMatchObject({ currency: 'GBP', amount_cents: 2000 });
    expect(find(owed, eur, person.id)).toMatchObject({ currency: 'EUR', amount_cents: 1000 });
  });

  test('marking paid stores the amount; marking again changes nothing', async () => {
    const api = await adminApi();
    const { talent, person } = await rated();
    const id = await apiBooking(api, talent.id);
    const share = { booking_id: id, user_id: person.id };
    expect(await pay(api, [share], 'BACS 42')).toHaveLength(1);
    expect((await api.patch(`/api/bookings/${id}`, { data: { fee_cents: 200_000 } })).status()).toBe(200);
    expect(await pay(api, [share])).toHaveLength(0);
    const [row] = await sql`SELECT paid_cents, paid_reference FROM booking_staff_shares WHERE booking_id = ${id} AND user_id = ${person.id}`;
    expect(row).toEqual({ paid_cents: 2000, paid_reference: 'BACS 42' });
    expect(find(await list(api, 'paid'), id, person.id)).toMatchObject({ paid_cents: 2000, paid_reference: 'BACS 42' });
    expect(find(await list(api, 'owed'), id, person.id)).toBeUndefined();
  });

  test('an unfinished booking’s share can’t be marked paid', async () => {
    const api = await adminApi();
    const { talent, person } = await rated();
    const id = await apiBooking(api, talent.id, inDays(5));
    expect(await pay(api, [{ booking_id: id, user_id: person.id }])).toHaveLength(0);
  });

  test('undo clears the payment', async () => {
    const api = await adminApi();
    const { talent, person } = await rated();
    const id = await apiBooking(api, talent.id);
    await pay(api, [{ booking_id: id, user_id: person.id }]);
    expect((await api.delete(`/api/payouts/team/${id}/${person.id}`)).status()).toBe(200);
    expect(find(await list(api, 'owed'), id, person.id)).toMatchObject({ amount_cents: 2000 });
    expect((await api.delete(`/api/payouts/team/${id}/${person.id}`)).status()).toBe(404);
  });

  test('a deactivated person’s share is still owed and payable', async () => {
    const api = await adminApi();
    const { talent, person } = await rated();
    const id = await apiBooking(api, talent.id);
    await sql`UPDATE users SET is_active = false WHERE id = ${person.id}`;
    expect(find(await list(api, 'owed'), id, person.id)).toBeDefined();
    expect(await pay(api, [{ booking_id: id, user_id: person.id }])).toHaveLength(1);
  });

  test('managers can’t see or pay team shares, even their own', async () => {
    const admin = await adminApi();
    const { talent, person } = await rated();
    const id = await apiBooking(admin, talent.id);
    const api = await teamApi(person.email, person.password);
    expect((await api.get('/api/payouts/team?view=owed')).status()).toBe(403);
    const share = { booking_id: id, user_id: person.id };
    expect((await api.post('/api/payouts/team/paid', { data: { shares: [share], paid_on: new Date().toISOString().slice(0, 10) } })).status()).toBe(403);
    expect((await api.delete(`/api/payouts/team/${id}/${person.id}`)).status()).toBe(403);
  });
});

test.describe('Your earnings', () => {
  type Earning = { booking_id: string; amount_cents: number; paid_at: string | null };
  type Earnings = { owed: Earning[]; paid: Earning[]; upcoming: Earning[] };

  async function earnings(email: string, password: string): Promise<{ status: number; body: any }> {
    const api = await teamApi(email, password);
    const response = await api.get('/api/earnings/mine');
    return { status: response.status(), body: await response.json() };
  }

  async function twoPeople() {
    const admin = await adminApi();
    const talent = await createTalent();
    const manager = await createTeamUser('manager', [talent.id]);
    const road = await createTeamUser('road_manager', [talent.id]);
    await setRate(manager.id, 10);
    await setRate(road.id, 5);
    return { admin, talent, manager, road };
  }

  test('each person sees only their own shares', async () => {
    const { admin, talent, manager, road } = await twoPeople();
    const id = await apiBooking(admin, talent.id);
    const mine = (await earnings(manager.email, manager.password)).body.data as Earnings;
    const theirs = (await earnings(road.email, road.password)).body.data as Earnings;
    expect(mine.owed.filter((e) => e.booking_id === id).map((e) => e.amount_cents)).toEqual([2000]);
    expect(theirs.owed.filter((e) => e.booking_id === id).map((e) => e.amount_cents)).toEqual([1000]);
  });

  test('no fee, commission or rate in the response', async () => {
    const { admin, talent, manager, road } = await twoPeople();
    await apiBooking(admin, talent.id);
    const text = JSON.stringify((await earnings(road.email, road.password)).body);
    for (const word of ['fee', 'commission', 'share_percent', 'person_name']) expect(text).not.toContain(word);
    const [other] = await sql`SELECT name FROM users WHERE id = ${manager.id}`;
    expect(text).not.toContain(other.name);
  });

  test('paid and upcoming are listed', async () => {
    const { admin, talent, manager } = await twoPeople();
    const paid = await apiBooking(admin, talent.id);
    const later = await apiBooking(admin, talent.id, { starts_at: new Date(Date.now() + 4 * DAY).toISOString(), ends_at: new Date(Date.now() + 4 * DAY + 3_600_000).toISOString() });
    const response = await admin.post('/api/payouts/team/paid', { data: { shares: [{ booking_id: paid, user_id: manager.id }], paid_on: new Date().toISOString().slice(0, 10) } });
    expect(response.status()).toBe(200);
    const data = (await earnings(manager.email, manager.password)).body.data as Earnings;
    expect(data.paid.find((e) => e.booking_id === paid)).toMatchObject({ amount_cents: 2000 });
    expect(data.paid.find((e) => e.booking_id === paid)?.paid_at).toBeTruthy();
    expect(data.upcoming.find((e) => e.booking_id === later)).toMatchObject({ amount_cents: 2000, paid_at: null });
    expect(data.owed.find((e) => e.booking_id === paid || e.booking_id === later)).toBeUndefined();
  });

  test('admins get 403', async () => {
    const api = await adminApi();
    expect((await api.get('/api/earnings/mine')).status()).toBe(403);
  });
});

test.describe('Screens', () => {
  async function signIn(page: import('@playwright/test').Page, api: APIRequestContext) {
    await page.context().addCookies((await api.storageState()).cookies);
  }

  test('admin pays a team share from the Team tab', async ({ page }) => {
    const admin = await adminApi();
    const talent = await createTalent();
    const person = await createTeamUser('road_manager', [talent.id]);
    const [{ name }] = await sql`UPDATE users SET name = ${uniq('E2E Payee')}, share_percent = 10 WHERE id = ${person.id} RETURNING name`;
    const id = await apiBooking(admin, talent.id);
    await signIn(page, admin);
    await page.goto('/admin/bookings/payouts?tab=team');
    const group = page.locator('section', { has: page.getByText(name, { exact: true }) });
    await expect(group.getByText('£20.00').first()).toBeVisible();
    await group.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: /Mark 1 as paid/ }).click();
    await page.getByRole('button', { name: 'Mark as paid', exact: true }).click();
    await expect(page.getByText('1 marked paid')).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    const [row] = await sql`SELECT paid_cents FROM booking_staff_shares WHERE booking_id = ${id} AND user_id = ${person.id}`;
    expect(row.paid_cents).toBe(2000);
  });

  test('managers don’t see the Team tab', async ({ page }) => {
    const manager = await createTeamUser('manager');
    await signIn(page, await teamApi(manager.email, manager.password));
    await page.goto('/admin/bookings/payouts');
    await expect(page.getByRole('button', { name: 'To pay' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Team' })).toHaveCount(0);
  });

  test('a road manager sees their earnings on the dashboard', async ({ page }) => {
    const admin = await adminApi();
    const talent = await createTalent();
    const road = await createTeamUser('road_manager', [talent.id]);
    await setRate(road.id, 5);
    await apiBooking(admin, talent.id, { fee_cents: 123_400 });
    await signIn(page, await teamApi(road.email, road.password));
    await page.goto('/admin');
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Your earnings' }) });
    await expect(card.getByText('£12.34').first()).toBeVisible();
    await expect(card.getByText('£1,234.00')).toHaveCount(0);
  });

  test('admin dashboard flags team pay owed, per currency', async () => {
    const admin = await adminApi();
    const talent = await createTalent();
    const person = await createTeamUser('manager', [talent.id]);
    await setRate(person.id, 10);
    await apiBooking(admin, talent.id);
    await apiBooking(admin, talent.id, { currency: 'EUR', starts_at: new Date(Date.now() - 6 * DAY).toISOString(), ends_at: new Date(Date.now() - 6 * DAY + 3_600_000).toISOString() });
    const body = await (await admin.get('/api/admin/dashboard')).json();
    const item = body.data.attention.find((a: { key: string }) => a.key === 'team-pay-owed');
    expect(item).toBeDefined();
    expect(item.href).toBe('/admin/bookings/payouts?tab=team');
    expect(item.detail).toContain('£');
    expect(item.detail).toContain('€');
  });

  test('team rates can be set on the rates page', async ({ page }) => {
    const admin = await adminApi();
    const person = await createTeamUser('manager');
    const [{ name }] = await sql`UPDATE users SET name = ${uniq('E2E Rate')} WHERE id = ${person.id} RETURNING name`;
    await signIn(page, admin);
    await page.goto('/admin/bookings/rates');
    await page.getByLabel(name).fill('10');
    await page.getByRole('button', { name: 'Save team rates' }).click();
    await expect.poll(async () => (await sql`SELECT share_percent FROM users WHERE id = ${person.id}`)[0].share_percent).toBe('10.00');
  });
});

test.describe('Review fixes', () => {
  test('an admin can remove an unpaid share; paid ones must be undone first', async () => {
    const admin = await adminApi();
    const talent = await createTalent();
    const person = await createTeamUser('manager', [talent.id]);
    await setRate(person.id, 10);
    const unpaid = await apiBooking(admin, talent.id);
    const paid = await apiBooking(admin, talent.id, { starts_at: new Date(Date.now() - 6 * DAY).toISOString(), ends_at: new Date(Date.now() - 6 * DAY + 3_600_000).toISOString() });
    await sql`UPDATE booking_staff_shares SET paid_at = NOW(), paid_cents = 2000 WHERE booking_id = ${paid}`;

    const own = await teamApi(person.email, person.password);
    expect((await own.post('/api/payouts/team/remove', { data: { booking_id: unpaid, user_id: person.id } })).status()).toBe(403);

    expect((await admin.post('/api/payouts/team/remove', { data: { booking_id: unpaid, user_id: person.id } })).status()).toBe(200);
    expect((await sharesOf(unpaid)).size).toBe(0);
    const earnings = (await (await own.get('/api/earnings/mine')).json()).data;
    expect(earnings.owed.find((e: { booking_id: string }) => e.booking_id === unpaid)).toBeUndefined();

    expect((await admin.post('/api/payouts/team/remove', { data: { booking_id: paid, user_id: person.id } })).status()).toBe(404);
    expect((await sharesOf(paid)).size).toBe(1);
  });

  test('a talent change keeps a deactivated person’s owed share when they also look after the new talent', async () => {
    const admin = await adminApi();
    const x = await createTalent();
    const y = await createTalent();
    const road = await createTeamUser('road_manager', [x.id, y.id]);
    await setRate(road.id, 5);
    const id = await apiBooking(admin, x.id);
    await sql`UPDATE users SET is_active = false WHERE id = ${road.id}`;
    expect((await admin.patch(`/api/bookings/${id}`, { data: { talent_id: y.id, force: true } })).status()).toBe(200);
    expect((await sharesOf(id)).get(road.id)).toEqual({ percent: 5, paid: false });
  });

  test.describe('when saving shares fails', () => {
    // A trigger makes inserting a 99.99% share fail, standing in for a dropped connection
    test.beforeAll(async () => {
      await sql`
        CREATE OR REPLACE FUNCTION e2e_fail_share() RETURNS trigger AS $$
        BEGIN
          IF NEW.share_percent = 99.99 THEN RAISE EXCEPTION 'e2e: share insert failed'; END IF;
          RETURN NEW;
        END $$ LANGUAGE plpgsql`;
      await sql`DROP TRIGGER IF EXISTS e2e_fail_share ON booking_staff_shares`;
      await sql`CREATE TRIGGER e2e_fail_share BEFORE INSERT ON booking_staff_shares FOR EACH ROW EXECUTE FUNCTION e2e_fail_share()`;
    });
    test.afterAll(async () => {
      await sql`DROP TRIGGER IF EXISTS e2e_fail_share ON booking_staff_shares`;
    });

    test('the booking isn’t created without its shares', async () => {
      const admin = await adminApi();
      const talent = await createTalent();
      const person = await createTeamUser('manager', [talent.id]);
      await setRate(person.id, 99.99);
      const title = uniq('E2E Atomic');
      const start = Date.now() - 3 * DAY;
      const response = await admin.post('/api/bookings', {
        data: { talent_id: talent.id, title, status: 'confirmed', starts_at: new Date(start).toISOString(), ends_at: new Date(start + 3_600_000).toISOString(), fee_cents: 100_000, commission_percent: 20, force: true },
      });
      expect(response.status()).toBe(500);
      expect(await sql`SELECT id FROM bookings WHERE title = ${title}`).toHaveLength(0);
    });

    test('a talent change isn’t saved without its shares', async () => {
      const admin = await adminApi();
      const x = await createTalent();
      const y = await createTalent();
      const old = await createTeamUser('manager', [x.id]);
      const next = await createTeamUser('manager', [y.id]);
      await setRate(old.id, 10);
      await setRate(next.id, 99.99);
      const id = await apiBooking(admin, x.id);
      expect((await admin.patch(`/api/bookings/${id}`, { data: { talent_id: y.id, force: true } })).status()).toBe(500);
      const [booking] = await sql`SELECT talent_id FROM bookings WHERE id = ${id}`;
      expect(booking.talent_id).toBe(x.id);
      expect((await sharesOf(id)).get(old.id)).toEqual({ percent: 10, paid: false });
    });
  });
});
