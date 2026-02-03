import { sql } from '../client';
import type { VIPPointsLog, VIPPointsLogWithDetails, PointsSource } from '../types';

export async function getAllPointsLogs(): Promise<VIPPointsLogWithDetails[]> {
  const logs = await sql<any[]>`
    SELECT
      vip_points_log.*,
      users.name as user_name,
      users.email as user_email
    FROM vip_points_log
    LEFT JOIN users ON vip_points_log.user_id = users.id
    ORDER BY vip_points_log.created_at DESC
  `;

  return logs.map(log => ({
    ...log,
    user: log.user_name ? {
      id: log.user_id,
      name: log.user_name,
      email: log.user_email,
      role: 'vip' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}

export async function getPointsLogsByUserId(
  userId: string,
  limit = 100
): Promise<VIPPointsLog[]> {
  const logs = await sql<VIPPointsLog[]>`
    SELECT * FROM vip_points_log
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return logs;
}

export async function getPointsLogsBySource(source: PointsSource): Promise<VIPPointsLog[]> {
  const logs = await sql<VIPPointsLog[]>`
    SELECT * FROM vip_points_log
    WHERE source = ${source}
    ORDER BY created_at DESC
  `;
  return logs;
}

export async function createPointsLogEntry(
  userId: string,
  source: PointsSource,
  deltaPoints: number,
  balanceAfter: number,
  metadata?: Record<string, any>,
  refId?: string
): Promise<VIPPointsLog> {
  const logs = await sql<VIPPointsLog[]>`
    INSERT INTO vip_points_log (
      user_id,
      source,
      ref_id,
      delta_points,
      balance_after,
      metadata
    )
    VALUES (
      ${userId},
      ${source},
      ${refId || null},
      ${deltaPoints},
      ${balanceAfter},
      ${JSON.stringify(metadata || {})}
    )
    RETURNING *
  `;
  return logs[0];
}

export async function getPointsActivity(
  userId: string,
  days = 30
): Promise<VIPPointsLog[]> {
  const logs = await sql<VIPPointsLog[]>`
    SELECT * FROM vip_points_log
    WHERE user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '${days} days'
    ORDER BY created_at DESC
  `;
  return logs;
}

export async function getPointsSummaryBySource(userId: string) {
  const summary = await sql<any[]>`
    SELECT
      source,
      COUNT(*) as transaction_count,
      SUM(delta_points) as total_points
    FROM vip_points_log
    WHERE user_id = ${userId}
    GROUP BY source
    ORDER BY total_points DESC
  `;

  return summary.map(s => ({
    source: s.source,
    transaction_count: parseInt(s.transaction_count),
    total_points: parseInt(s.total_points)
  }));
}

export async function getRecentPointsLogs(limit = 100): Promise<VIPPointsLogWithDetails[]> {
  const logs = await sql<any[]>`
    SELECT
      vip_points_log.*,
      users.name as user_name,
      users.email as user_email
    FROM vip_points_log
    LEFT JOIN users ON vip_points_log.user_id = users.id
    ORDER BY vip_points_log.created_at DESC
    LIMIT ${limit}
  `;

  return logs.map(log => ({
    ...log,
    user: log.user_name ? {
      id: log.user_id,
      name: log.user_name,
      email: log.user_email,
      role: 'vip' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}
