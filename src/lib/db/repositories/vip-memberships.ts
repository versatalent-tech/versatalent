import { sql } from '../client';
import type { VIPMembership, VIPMembershipWithUser, UpdateVIPMembershipRequest, User } from '../types';

export async function getAllVIPMemberships(): Promise<VIPMembershipWithUser[]> {
  const memberships = await sql<(VIPMembership & {
    user_name: string;
    user_email: string;
    user_role: string;
    user_avatar_url?: string;
  })[]>`
    SELECT
      vip_memberships.*,
      users.name as user_name,
      users.email as user_email,
      users.role as user_role,
      users.avatar_url as user_avatar_url
    FROM vip_memberships
    LEFT JOIN users ON vip_memberships.user_id = users.id
    ORDER BY vip_memberships.lifetime_points DESC
  `;

  return memberships.map(m => ({
    ...m,
    user: {
      id: m.user_id,
      name: m.user_name,
      email: m.user_email,
      role: m.user_role as any,
      avatar_url: m.user_avatar_url,
      created_at: new Date(),
      updated_at: new Date()
    }
  }));
}

export async function getVIPMembershipByUserId(userId: string): Promise<VIPMembership | null> {
  const memberships = await sql<VIPMembership[]>`
    SELECT * FROM vip_memberships WHERE user_id = ${userId} LIMIT 1
  `;
  return memberships[0] || null;
}

export async function getVIPMembershipById(id: string): Promise<VIPMembership | null> {
  const memberships = await sql<VIPMembership[]>`
    SELECT * FROM vip_memberships WHERE id = ${id} LIMIT 1
  `;
  return memberships[0] || null;
}

export async function createVIPMembership(userId: string): Promise<VIPMembership> {
  const memberships = await sql<VIPMembership[]>`
    INSERT INTO vip_memberships (user_id, tier, points_balance, lifetime_points, status)
    VALUES (${userId}, 'silver', 0, 0, 'active')
    ON CONFLICT (user_id) DO UPDATE
    SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return memberships[0];
}

export async function updateVIPMembership(
  userId: string,
  data: UpdateVIPMembershipRequest
): Promise<VIPMembership> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.tier !== undefined) {
    updates.push(`tier = $${paramIndex++}`);
    values.push(data.tier);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.points_balance !== undefined) {
    updates.push(`points_balance = $${paramIndex++}`);
    values.push(data.points_balance);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);
  const query = `
    UPDATE vip_memberships
    SET ${updates.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `;

  const memberships = await sql<VIPMembership[]>(query, values);
  return memberships[0];
}

export async function addPointsToMembership(
  userId: string,
  points: number
): Promise<VIPMembership> {
  const memberships = await sql<VIPMembership[]>`
    UPDATE vip_memberships
    SET
      points_balance = points_balance + ${points},
      lifetime_points = lifetime_points + GREATEST(${points}, 0)
    WHERE user_id = ${userId}
    RETURNING *
  `;
  return memberships[0];
}

export async function getVIPMembershipsByTier(tier: string): Promise<VIPMembership[]> {
  const memberships = await sql<VIPMembership[]>`
    SELECT * FROM vip_memberships
    WHERE tier = ${tier} AND status = 'active'
    ORDER BY points_balance DESC
  `;
  return memberships;
}

export async function getVIPLeaderboard(limit = 10): Promise<VIPMembershipWithUser[]> {
  const memberships = await sql<(VIPMembership & {
    user_name: string;
    user_email: string;
  })[]>`
    SELECT
      vip_memberships.*,
      users.name as user_name,
      users.email as user_email
    FROM vip_memberships
    LEFT JOIN users ON vip_memberships.user_id = users.id
    WHERE vip_memberships.status = 'active'
    ORDER BY vip_memberships.lifetime_points DESC
    LIMIT ${limit}
  `;

  return memberships.map(m => ({
    ...m,
    user: {
      id: m.user_id,
      name: m.user_name,
      email: m.user_email,
      role: 'vip' as any,
      created_at: new Date(),
      updated_at: new Date()
    }
  }));
}

export async function calculateTier(points: number): Promise<string> {
  const result = await sql<{ calculate_vip_tier: string }[]>`
    SELECT calculate_vip_tier(${points}) as calculate_vip_tier
  `;
  return result[0].calculate_vip_tier;
}
