import { test, expect } from '@playwright/test';
import { createMember, pointsFor, sql } from '../support/db';

/** loyalty_post() is the only way balances change (migration 031) */
const post = (userId: string, ledger: string, delta: number, key: string | null, mode = 'clamp') =>
  sql`SELECT * FROM loyalty_post(${userId}::uuid, ${ledger}, ${delta}::integer, 'manual_adjust', ${key}, NULL, '{}'::jsonb, NULL, ${mode})`;

test.describe('Points ledger', () => {
  test('a repeated source key is applied once', async () => {
    const m = await createMember();
    const first = await post(m.id, 'reward', 25, `e2e:${m.id}:a`);
    const again = await post(m.id, 'reward', 25, `e2e:${m.id}:a`);
    expect(first[0]).toMatchObject({ out_applied: 25, out_balance: 25, out_duplicate: false });
    expect(again[0]).toMatchObject({ out_applied: 25, out_balance: 25, out_duplicate: true });
    expect((await pointsFor(m.id)).reward).toBe(25);
  });

  test('strict refuses to go below zero; clamp takes what’s there; reset empties', async () => {
    const m = await createMember();
    await post(m.id, 'reward', 10, null);
    await expect(post(m.id, 'reward', -11, null, 'strict')).rejects.toThrow(/Not enough points: 10 available/);

    const clamped = await post(m.id, 'reward', -50, null, 'clamp');
    expect(clamped[0]).toMatchObject({ out_applied: -10, out_balance: 0 });
    const [entry] = await sql`SELECT metadata FROM vip_points_log WHERE id = ${clamped[0].out_id}`;
    expect(entry.metadata.requested).toBe(-50);

    await post(m.id, 'status', 40, null);
    const reset = await post(m.id, 'status', 0, null, 'reset');
    expect(reset[0]).toMatchObject({ out_applied: -40, out_balance: 0 });
  });

  test('balances always equal the sum of their ledger entries', async () => {
    const m = await createMember();
    for (const [ledger, delta] of [['reward', 30], ['status', 30], ['reward', -12], ['status', 5], ['reward', 7]] as const) {
      await post(m.id, ledger, delta, null);
    }
    const [sums] = await sql`
      SELECT COALESCE(SUM(delta_points) FILTER (WHERE ledger = 'reward'), 0)::int AS reward,
             COALESCE(SUM(delta_points) FILTER (WHERE ledger = 'status'), 0)::int AS status
      FROM vip_points_log WHERE user_id = ${m.id}
    `;
    const balances = await pointsFor(m.id);
    expect({ reward: balances.reward, status: balances.status }).toEqual({ reward: sums.reward, status: sums.status });
    expect(balances.reward).toBe(25);
  });

  test('unknown ledgers and members are refused', async () => {
    const m = await createMember();
    await expect(post(m.id, 'bonus', 5, null)).rejects.toThrow(/Unknown ledger/);
    await expect(post('00000000-0000-4000-8000-000000000000', 'reward', 5, null)).rejects.toThrow(/No membership/);
  });
});
