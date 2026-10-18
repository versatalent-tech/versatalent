import { getCurrentSession, getTeamSession } from '@/lib/middleware/auth';
import { getTalentSession } from '@/lib/auth/talent-auth';
import { getUserById } from '@/lib/db/repositories/users';

/**
 * May the caller read this member's loyalty data (membership, points,
 * check-ins)? The public VIP pass page reads it by member id, which only
 * comes from the member's own card. Anyone else's id (an artist's, staff)
 * must not open their data, so anonymous callers only get VIP members.
 */
export async function canReadMemberData(userId: string): Promise<boolean> {
  if ((await getCurrentSession()) || (await getTeamSession())) return true;
  const talent = await getTalentSession();
  if (talent?.userId === userId) return true;
  const user = await getUserById(userId).catch(() => null);
  return user?.role === 'vip';
}
