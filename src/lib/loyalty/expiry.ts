/**
 * Reward points expiry, run nightly (netlify/functions/points-expiry.mts).
 * Relative imports only, like the other scheduled jobs.
 *
 * Members with no points earned or spent for the months set in Admin →
 * Rewards (programme_settings.reward_expiry_months, 0 = off) lose their
 * reward points. Status points (the tier) aren't touched. Each expiry is a
 * ledger entry keyed to the member's last activity, so it never happens twice
 * for the same quiet spell, and the next earn starts a new one. The clock
 * never starts before the day expiry was switched on (reward_expiry_since)
 * or rewards opened (rewards_opened_at), and nothing expires while rewards
 * are closed: points build up in the background until launch.
 * Keep this rule in step with getPointsExpiry() in repositories/loyalty.ts.
 */
import { sql } from '../db/client';

export async function expireInactivePoints(): Promise<number> {
  const settings = await sql`SELECT key, value FROM programme_settings WHERE key IN ('reward_expiry_months', 'rewards_open')`;
  const value = (key: string) => settings.find((s: any) => s.key === key)?.value;
  const months = Math.min(120, Math.max(0, Math.trunc(Number(value('reward_expiry_months')) || 0)));
  // Points keep building up while rewards are closed, so nothing expires before they launch
  if (!months || value('rewards_open') !== true) return 0;

  const rows = await sql`
    SELECT user_id, last_activity FROM (
      SELECT m.user_id,
        -- Never before a full period from the day expiry was switched on
        GREATEST(
          COALESCE((SELECT MAX(l.created_at) FROM vip_points_log l
            WHERE l.user_id = m.user_id AND l.ledger IN ('status', 'reward')
              AND l.source NOT IN ('points_expiry', 'year_end', 'opening_balance')), m.created_at),
          COALESCE((SELECT MAX((value #>> '{}')::timestamptz) FROM programme_settings
            WHERE key IN ('reward_expiry_since', 'rewards_opened_at')), '-infinity')
        ) AS last_activity
      FROM vip_memberships m WHERE m.points_balance > 0
    ) q
    WHERE last_activity < NOW() - make_interval(months => ${months})
    LIMIT 500
  `;
  let expired = 0;
  for (const r of rows) {
    const last = new Date(r.last_activity).toISOString();
    const result = await sql`
      SELECT * FROM loyalty_post(${r.user_id}::uuid, 'reward', 0, 'points_expiry', ${`expiry:${r.user_id}:${last}`}, NULL,
        ${JSON.stringify({ months, last_activity: last })}::jsonb, NULL, 'reset')
    `;
    if (!result[0]?.out_duplicate && Number(result[0]?.out_applied) !== 0) expired++;
  }
  return expired;
}

/** Requests and claims not used in time: closed, held points returned */
export async function expireOpenClaims(): Promise<number> {
  const rows = await sql`SELECT reward_expire_claims() AS n`;
  return Number(rows[0]?.n ?? 0);
}
