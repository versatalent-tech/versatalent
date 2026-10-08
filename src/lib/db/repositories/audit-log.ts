import { sql } from '../client';

export interface AuditActor {
  userId?: string;
  name?: string;
}

export interface AuditEntry {
  id: number;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Record a change. Failures are logged, not thrown: the change itself has
 * already happened and shouldn't be reported to the user as failed.
 */
export async function logAudit(
  actor: AuditActor,
  action: string,
  entity: string,
  entityId: string | null,
  changes: { before?: unknown; after?: unknown } = {}
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (actor_user_id, actor_name, action, entity, entity_id, before, after)
      VALUES (
        ${actor.userId ?? null}, ${actor.name ?? null}, ${action}, ${entity}, ${entityId},
        ${changes.before === undefined ? null : JSON.stringify(changes.before)},
        ${changes.after === undefined ? null : JSON.stringify(changes.after)}
      )
    `;
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getRecentAuditEntries(limit = 50): Promise<AuditEntry[]> {
  const rows = await sql`
    SELECT id, actor_user_id, actor_name, action, entity, entity_id, before, after, created_at
    FROM audit_log
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((row) => ({
    ...row,
    id: Number(row.id),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}
