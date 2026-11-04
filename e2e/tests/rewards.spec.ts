import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createEvent, createMember, pointsFor, sql, uniq } from '../support/db';
import { adminApi } from '../support/auth';
import { expireInactivePoints } from '../../src/lib/loyalty/expiry';

/** A reward only these tests use (rewards are switched on for the test copy) */
async function createReward(opts: { cost?: number; requiresEvent?: boolean } = {}) {
  const [row] = await sql`
    INSERT INTO rewards (title, kind, point_cost, unit_cost_cents, is_active, requires_event, claim_valid_days)
    VALUES (${uniq('E2E reward')}, ${opts.requiresEvent ? 'guest_pass' : 'drink'}, ${opts.cost ?? 100}, 150, true, ${opts.requiresEvent ?? false}, 30)
    RETURNING id
  `;
  return row.id as string;
}

async function givePoints(userId: string, points: number) {
  await sql`SELECT loyalty_post(${userId}::uuid, 'reward', ${points}, 'manual_adjust', ${`e2e:${randomUUID()}`}, NULL, '{}'::jsonb, NULL, 'clamp')`;
}

async function claimCode(claimId: string) {
  const [row] = await sql`SELECT code FROM reward_claims WHERE id = ${claimId}`;
  return row.code as string;
}

test.beforeAll(async () => {
  await sql`UPDATE programme_settings SET value = 'true' WHERE key = 'rewards_open'`;
});

test.describe('Rewards need staff and the card', () => {
  test('asking on the pass takes no points; staff confirming takes them, once', async ({ request }) => {
    const member = await createMember();
    await givePoints(member.id, 300);
    const rewardId = await createReward({ cost: 100 });

    const asked = await request.post('/api/rewards/claim', { data: { member: member.id, reward_id: rewardId } });
    const body = await asked.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('requested');
    expect(body.data.code).toBe(''); // never shown on the pass
    expect((await pointsFor(member.id)).reward).toBe(300);

    const again = await request.post('/api/rewards/claim', { data: { member: member.id, reward_id: rewardId } });
    expect((await again.json()).error).toContain('already asked');

    const pass = await (await request.get(`/api/rewards?member=${member.id}`)).json();
    expect(pass.data.claims.every((c: { code: string }) => c.code === '')).toBe(true);

    const staff = await adminApi();
    const lookup = await (await staff.get(`/api/staff/rewards?code=${await claimCode(body.data.id)}`)).json();
    expect(lookup.data.claims.map((c: { id: string }) => c.id)).toContain(body.data.id);

    const confirmed = await staff.post('/api/staff/rewards', { data: { action: 'redeem', claim_id: body.data.id } });
    expect((await confirmed.json()).data.claim.status).toBe('redeemed');
    expect((await pointsFor(member.id)).reward).toBe(200);

    const twice = await staff.post('/api/staff/rewards', { data: { action: 'redeem', claim_id: body.data.id } });
    expect((await twice.json()).error).toContain('Already used');
    expect((await pointsFor(member.id)).reward).toBe(200);
  });

  test('the pass can only withdraw a request, never spend or cancel a used reward', async ({ request }) => {
    const member = await createMember();
    await givePoints(member.id, 300);
    const rewardId = await createReward({ cost: 100 });

    const asked = (await (await request.post('/api/rewards/claim', { data: { member: member.id, reward_id: rewardId } })).json()).data;
    const withdrawn = await request.post(`/api/rewards/claims/${asked.id}/cancel`, { data: { member: member.id } });
    expect((await withdrawn.json()).data.status).toBe('cancelled');
    expect((await pointsFor(member.id)).reward).toBe(300);

    const staff = await adminApi();
    const given = await (await staff.post('/api/staff/rewards', { data: { action: 'give', user_id: member.id, reward_id: rewardId } })).json();
    expect((await pointsFor(member.id)).reward).toBe(200);
    const cancel = await request.post(`/api/rewards/claims/${given.data.claim.id}/cancel`, { data: { member: member.id } });
    expect((await cancel.json()).error).toBe('Ask a member of staff to cancel this.');
    expect((await pointsFor(member.id)).reward).toBe(200);
  });

  test('a request for an event can only be confirmed on the day, and needs the points then', async ({ request }) => {
    const member = await createMember();
    await givePoints(member.id, 150);
    const rewardId = await createReward({ cost: 100, requiresEvent: true });
    const later = await createEvent({ startsInDays: 5 });

    const asked = (await (await request.post('/api/rewards/claim', { data: { member: member.id, reward_id: rewardId, event_id: later.id } })).json()).data;
    const staff = await adminApi();
    const early = await staff.post('/api/staff/rewards', { data: { action: 'redeem', claim_id: asked.id } });
    expect((await early.json()).error).toContain('It can be used on the day');

    // On the day, but the member has spent their points in the meantime
    await sql`UPDATE events SET start_time = NOW() + INTERVAL '1 hour' WHERE id = ${later.id}`;
    await sql`SELECT loyalty_post(${member.id}::uuid, 'reward', -100, 'manual_adjust', ${`e2e:${randomUUID()}`}, NULL, '{}'::jsonb, NULL, 'clamp')`;
    const short = await staff.post('/api/staff/rewards', { data: { action: 'redeem', claim_id: asked.id } });
    expect((await short.json()).error).toContain('Not enough points');
    expect((await pointsFor(member.id)).reward).toBe(50);
  });
});

test.describe('Reward points expiry', () => {
  test('points build up while rewards are hidden, and only expire after launch, once, from the launch day', async ({ request }) => {
    const quiet = await createMember();
    const active = await createMember();
    await givePoints(quiet.id, 120);
    await givePoints(active.id, 80);
    await sql`UPDATE vip_points_log SET created_at = NOW() - INTERVAL '14 months' WHERE user_id = ${quiet.id}`;
    await sql`UPDATE vip_memberships SET created_at = NOW() - INTERVAL '2 years' WHERE user_id = ${quiet.id}`;
    const statusBefore = (await pointsFor(quiet.id)).status;
    const longAgo = sql`to_jsonb((NOW() - INTERVAL '13 months')::text)`;

    const admin = await adminApi();
    try {
      await sql`DELETE FROM programme_settings WHERE key IN ('reward_expiry_since', 'rewards_opened_at')`;
      await sql`UPDATE programme_settings SET value = '0' WHERE key = 'reward_expiry_months'`;

      // Hidden: the pass doesn't show reward points, and nothing expires
      await admin.put('/api/admin/rewards', { data: { rewards_open: false } });
      const on = await admin.put('/api/admin/rewards', { data: { reward_expiry_months: 12 } });
      expect((await on.json()).data.reward_expiry_months).toBe(12);
      await sql`UPDATE programme_settings SET value = ${longAgo} WHERE key = 'reward_expiry_since'`;
      await expireInactivePoints();
      expect((await pointsFor(quiet.id)).reward).toBe(120);
      expect((await (await request.get(`/api/vip/memberships/${quiet.id}`)).json()).rewards_open).toBe(false);
      expect((await (await request.get(`/api/rewards?member=${quiet.id}`)).json()).data.points_expire_on).toBeNull();

      // Launch: everyone gets the full 12 months from today
      await admin.put('/api/admin/rewards', { data: { rewards_open: true } });
      await expireInactivePoints();
      expect((await pointsFor(quiet.id)).reward).toBe(120);
      const pass = await (await request.get(`/api/rewards?member=${quiet.id}`)).json();
      expect(new Date(pass.data.points_expire_on).getTime()).toBeGreaterThan(Date.now() + 360 * 86_400_000);
      expect((await (await request.get(`/api/vip/memberships/${quiet.id}`)).json()).rewards_open).toBe(true);

      // A year after launch
      await sql`UPDATE programme_settings SET value = ${longAgo} WHERE key = 'rewards_opened_at'`;
      await expireInactivePoints();
      await expireInactivePoints();
      const after = await pointsFor(quiet.id);
      expect(after.reward).toBe(0);
      expect(after.status).toBe(statusBefore);
      expect(after.log.filter((l: { source: string }) => l.source === 'points_expiry')).toHaveLength(1);
      expect((await pointsFor(active.id)).reward).toBe(80);
    } finally {
      await sql`UPDATE programme_settings SET value = '0' WHERE key = 'reward_expiry_months'`;
      await sql`UPDATE programme_settings SET value = 'true' WHERE key = 'rewards_open'`;
      await sql`DELETE FROM programme_settings WHERE key IN ('reward_expiry_since', 'rewards_opened_at')`;
    }
  });
});
