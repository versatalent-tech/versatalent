import { cookies } from 'next/headers';
import { sql } from '@/lib/db/client';
import { SESSION_COOKIE_OPTIONS, TALENT_SESSION_COOKIE, signSession, verifySession } from '@/lib/auth/session';
import { ApiErrors } from '@/lib/utils/api-response';

/**
 * Talent portal sessions. Talents sign in with their 'artist' user account,
 * which is linked to their talent profile (users.talent_id). The talent ID is
 * always read from the database, never from the request.
 */

export interface TalentSession {
  userId: string;
  talentId: string;
  name: string;
  email: string;
  talentName: string;
}

export async function startTalentSession(user: { id: string; name: string; email: string }): Promise<void> {
  const token = await signSession({ userId: user.id, role: 'artist', name: user.name, email: user.email });
  const cookieStore = await cookies();
  cookieStore.set(TALENT_SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export async function endTalentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TALENT_SESSION_COOKIE);
}

/** The signed-in talent, re-checked against the database on every call */
export async function getTalentSession(): Promise<TalentSession | null> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(TALENT_SESSION_COOKIE)?.value);
  if (!session || session.role !== 'artist' || !session.userId) return null;

  const rows = await sql`
    SELECT u.id, u.name, u.email, u.talent_id, t.name AS talent_name
    FROM users u JOIN talents t ON t.id = u.talent_id
    WHERE u.id = ${session.userId} AND u.role = 'artist' AND u.is_active
    LIMIT 1
  `;
  const user = rows[0];
  if (!user) return null;
  return { userId: user.id, talentId: user.talent_id, name: user.name, email: user.email, talentName: user.talent_name };
}

/** Inline guard for portal routes: the session, or a 401 response */
export async function requireTalent(): Promise<{ talent: TalentSession } | { response: Response }> {
  const talent = await getTalentSession();
  return talent ? { talent } : { response: ApiErrors.Unauthorized('Please sign in') };
}
