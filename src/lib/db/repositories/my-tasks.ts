import { sql } from '../client';
import type { MyTask } from '@/lib/tasks/types';

/**
 * Tasks given to one person, for the dashboard (road managers) and the
 * talent portal: open ones, and ones done in the last week. Only what the
 * task says, its due date and who added it; never the client or deal.
 */
export async function listMyTasks(userId: string, opts: { withSource: boolean }): Promise<MyTask[]> {
  const rows = await sql`
    SELECT id, subject, body, due_at, completed_at, created_by_name
    FROM activities
    WHERE owner_user_id = ${userId} AND type = 'task'
      AND (completed_at IS NULL OR completed_at > NOW() - INTERVAL '7 days')
    ORDER BY (completed_at IS NOT NULL), due_at ASC NULLS LAST, created_at
    LIMIT 100
  `;
  return rows.map((r: any) => ({
    id: r.id,
    subject: r.subject,
    source: opts.withSource ? (r.body ?? null) : null,
    due_at: r.due_at ? new Date(r.due_at).toISOString() : null,
    completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    added_by: r.created_by_name ?? null,
  }));
}

/** Tick off (or reopen) one of your own tasks; false if it isn't yours */
export async function setMyTaskDone(userId: string, taskId: string, done: boolean): Promise<boolean> {
  const rows = await sql`
    UPDATE activities SET completed_at = ${done ? sql`COALESCE(completed_at, NOW())` : null}
    WHERE id = ${taskId} AND owner_user_id = ${userId} AND type = 'task'
    RETURNING id
  `;
  return rows.length > 0;
}
