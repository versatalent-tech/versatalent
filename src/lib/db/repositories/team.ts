import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from '../client';
import { isScopedRole, type TeamRole } from '@/lib/auth/permissions';

/** Roles managed from the Team page. Talents get their logins from the talent pages. */
export const MANAGEABLE_ROLES = ['admin', 'manager', 'road_manager', 'staff'] as const;
export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

const LINK_LIFETIME_HOURS = { invite: 7 * 24, reset: 24 } as const;
export type AuthLinkPurpose = keyof typeof LINK_LIFETIME_HOURS;

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: ManageableRole;
  is_active: boolean;
  has_password: boolean;
  last_login_at: string | null;
  link_expires_at: string | null; // an unused invite/reset link is outstanding
  talents: { id: string; name: string }[];
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapMember(row: any): TeamMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    has_password: row.has_password,
    last_login_at: toIso(row.last_login_at),
    link_expires_at: toIso(row.link_expires_at),
    talents: row.talents ?? [],
  };
}

// A function, not a constant: building the fragment needs a configured client
const memberColumns = () => sql`
  u.id, u.name, u.email, u.role, u.is_active, u.last_login_at,
  (u.password_hash IS NOT NULL) AS has_password,
  (SELECT MAX(expires_at) FROM auth_tokens t
     WHERE t.user_id = u.id AND t.used_at IS NULL AND t.expires_at > NOW()) AS link_expires_at,
  COALESCE(
    (SELECT json_agg(json_build_object('id', tl.id, 'name', tl.name) ORDER BY tl.name)
       FROM talent_assignments ta JOIN talents tl ON tl.id = ta.talent_id
      WHERE ta.user_id = u.id),
    '[]'
  ) AS talents
`;

export async function listTeamMembers(): Promise<TeamMember[]> {
  const rows = await sql`
    SELECT ${memberColumns()}
    FROM users u
    WHERE u.role = ANY(${MANAGEABLE_ROLES as unknown as string[]})
    ORDER BY u.is_active DESC, array_position(${MANAGEABLE_ROLES as unknown as string[]}, u.role), u.name
  `;
  return rows.map(mapMember);
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const rows = await sql`
    SELECT ${memberColumns()}
    FROM users u
    WHERE u.id = ${id} AND u.role = ANY(${MANAGEABLE_ROLES as unknown as string[]})
    LIMIT 1
  `;
  return rows[0] ? mapMember(rows[0]) : null;
}

export async function emailExists(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
  return rows.length > 0;
}

/** Create an account with no password; the person sets one through an invite link */
export async function createTeamMember(data: { name: string; email: string; role: ManageableRole }): Promise<string> {
  const rows = await sql`
    INSERT INTO users (name, email, role, is_active)
    VALUES (${data.name}, ${data.email}, ${data.role}, true)
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateTeamMember(
  id: string,
  data: { name?: string; role?: ManageableRole; is_active?: boolean }
): Promise<void> {
  await sql`
    UPDATE users SET
      name = COALESCE(${data.name ?? null}, name),
      role = COALESCE(${data.role ?? null}, role),
      is_active = COALESCE(${data.is_active ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function setTalentAssignments(userId: string, talentIds: string[]): Promise<void> {
  await sql.transaction([
    sql`DELETE FROM talent_assignments WHERE user_id = ${userId}`,
    sql`
      INSERT INTO talent_assignments (user_id, talent_id)
      SELECT ${userId}, t.id FROM talents t WHERE t.id = ANY(${talentIds}::uuid[])
    `,
  ]);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a one-time link token for setting a password. Any earlier unused
 * link for the same person stops working. Returns the raw token (shown once).
 */
export async function createAuthLink(
  userId: string,
  purpose: AuthLinkPurpose,
  createdBy?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + LINK_LIFETIME_HOURS[purpose] * 60 * 60 * 1000);

  await sql.transaction([
    sql`UPDATE auth_tokens SET expires_at = NOW() WHERE user_id = ${userId} AND used_at IS NULL AND expires_at > NOW()`,
    sql`
      INSERT INTO auth_tokens (user_id, purpose, token_hash, created_by, expires_at)
      VALUES (${userId}, ${purpose}, ${hashToken(token)}, ${createdBy ?? null}, ${expiresAt.toISOString()})
    `,
  ]);

  return { token, expiresAt };
}

/** Who a still-valid link belongs to, without using it up */
export async function peekAuthLink(token: string): Promise<{ name: string; purpose: AuthLinkPurpose } | null> {
  const rows = await sql`
    SELECT u.name, t.purpose
    FROM auth_tokens t JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ${hashToken(token)} AND t.used_at IS NULL AND t.expires_at > NOW() AND u.is_active
    LIMIT 1
  `;
  return rows[0] ? { name: rows[0].name, purpose: rows[0].purpose } : null;
}

/**
 * Use up a link and set the password. The UPDATE ... RETURNING claims the
 * token atomically, so the same link can't be used twice.
 */
export async function redeemAuthLink(
  token: string,
  password: string
): Promise<{ userId: string; name: string; role: string; purpose: AuthLinkPurpose } | null> {
  const claimed = await sql`
    UPDATE auth_tokens t SET used_at = NOW()
    FROM users u
    WHERE t.user_id = u.id AND u.is_active
      AND t.token_hash = ${hashToken(token)} AND t.used_at IS NULL AND t.expires_at > NOW()
    RETURNING t.user_id, t.purpose, u.name, u.role
  `;
  if (claimed.length === 0) {
    return null;
  }

  const { user_id, purpose, name, role } = claimed[0];
  const passwordHash = await bcrypt.hash(password, 10);
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${user_id}`;

  return { userId: user_id, name, role, purpose };
}

export async function recordLogin(userId: string): Promise<void> {
  await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userId}`;
}

/**
 * Which talents a team member may see: 'all' for admins, otherwise the IDs
 * assigned to them. Always derive this from the session, never the request.
 */
export async function getTalentScope(session: { userId?: string; role: TeamRole }): Promise<'all' | string[]> {
  if (!isScopedRole(session.role)) {
    return 'all';
  }
  if (!session.userId) {
    return [];
  }
  const rows = await sql`SELECT talent_id FROM talent_assignments WHERE user_id = ${session.userId}`;
  return rows.map((row: any) => row.talent_id);
}
