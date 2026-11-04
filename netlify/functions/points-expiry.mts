/**
 * Scheduled function: reward points expire for members with nothing earned
 * or spent for the months set in Admin → Rewards (off when 0), and requests
 * and claims not used in time are closed.
 */
import { expireInactivePoints, expireOpenClaims } from '../../src/lib/loyalty/expiry';

export default async () => {
  await expireOpenClaims();
  const expired = await expireInactivePoints();
  if (expired > 0) console.log(`[points-expiry] Reward points expired for ${expired} member(s)`);
};

export const config = { schedule: '@daily' };
