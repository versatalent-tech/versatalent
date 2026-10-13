import { randomBytes } from 'node:crypto';
import type { z } from 'zod';
import { sql } from '../client';
import { dealVisible, orgVisible, type CrmActor, type CrmScope } from './crm';
import type { Meeting, MeetingActionItem, MeetingSummary } from '@/lib/crm/types';
import type { meetingNotesSchema, meetingSchema } from '@/lib/crm/schemas';

/**
 * CRM meetings. Like the rest of the CRM, every read takes the session's
 * scope: admins see everything; managers see meetings they created, or that
 * are on a deal or client they can see, or that involve a talent assigned to
 * them. The drafting job itself lives in lib/meetings/ai-notes.
 */

type MeetingInput = z.infer<typeof meetingSchema>;
type NotesInput = z.infer<typeof meetingNotesSchema>;

function meetingVisible(scope: CrmScope) {
  if (scope.all) return sql`TRUE`;
  return sql`(
    m.created_by = ${scope.userId}
    OR m.talent_ids && ${scope.talentIds}::uuid[]
    OR (m.deal_id IS NOT NULL AND ${dealVisible(scope)})
    OR (m.organisation_id IS NOT NULL AND ${orgVisible(scope)})
  )`;
}

// Aliases are fixed by the visibility helpers: deals d, organisations o
const meetingSelect = () => sql`
  SELECT
    m.*,
    d.title AS deal_title,
    o.name AS organisation_name,
    COALESCE(
      (SELECT json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
         FROM talents t WHERE t.id = ANY(m.talent_ids)),
      '[]'
    ) AS talents
  FROM meetings m
  LEFT JOIN deals d ON d.id = m.deal_id
  LEFT JOIN organisations o ON o.id = m.organisation_id
`;

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function ref(id: unknown, name: unknown) {
  return id ? { id: String(id), name: String(name ?? '') } : null;
}

function actionItems(value: unknown): MeetingActionItem[] {
  return Array.isArray(value) ? (value as MeetingActionItem[]) : [];
}

function mapSummary(row: any): MeetingSummary {
  const items = actionItems(row.action_items);
  return {
    id: row.id,
    title: row.title,
    starts_at: iso(row.starts_at)!,
    ends_at: iso(row.ends_at),
    location: row.location,
    deal: ref(row.deal_id, row.deal_title),
    organisation: ref(row.organisation_id, row.organisation_name),
    talents: row.talents ?? [],
    has_transcript: Boolean(row.transcript),
    has_notes: Boolean(row.summary) || items.length > 0,
    ai_status: row.ai_status,
    open_action_items: items.filter((item) => !item.task_activity_id).length,
    created_by_name: row.created_by_name,
  };
}

function mapMeeting(row: any): Meeting {
  return {
    ...mapSummary(row),
    attendees: row.attendees,
    transcript: row.transcript,
    transcript_consent_at: iso(row.transcript_consent_at),
    summary: row.summary,
    decisions: Array.isArray(row.decisions) ? row.decisions : [],
    action_items: actionItems(row.action_items),
    notes_reviewed_at: iso(row.notes_reviewed_at),
    notes_reviewed_by_name: row.notes_reviewed_by_name,
    ai_requested_at: iso(row.ai_requested_at),
    ai_generated_at: iso(row.ai_generated_at),
    ai_error: row.ai_error,
    created_by: row.created_by,
    created_at: iso(row.created_at)!,
  };
}

export async function listMeetings(
  scope: CrmScope,
  filters: { dealId?: string; organisationId?: string } = {}
): Promise<MeetingSummary[]> {
  const dealId = filters.dealId ?? null;
  const organisationId = filters.organisationId ?? null;
  const rows = await sql`
    ${meetingSelect()}
    WHERE ${meetingVisible(scope)}
      AND (${dealId}::uuid IS NULL OR m.deal_id = ${dealId})
      AND (${organisationId}::uuid IS NULL OR m.organisation_id = ${organisationId}
           OR m.deal_id IN (SELECT id FROM deals WHERE organisation_id = ${organisationId}))
    ORDER BY m.starts_at DESC
    LIMIT 300
  `;
  return rows.map(mapSummary);
}

export async function getMeeting(scope: CrmScope, id: string): Promise<Meeting | null> {
  const rows = await sql`${meetingSelect()} WHERE m.id = ${id} AND ${meetingVisible(scope)} LIMIT 1`;
  return rows[0] ? mapMeeting(rows[0]) : null;
}

export async function createMeeting(actor: CrmActor, data: MeetingInput): Promise<string> {
  const rows = await sql`
    INSERT INTO meetings (title, starts_at, ends_at, location, deal_id, organisation_id, talent_ids, attendees, created_by, created_by_name)
    VALUES (
      ${data.title}, ${data.starts_at}, ${data.ends_at ?? null}, ${data.location ?? null}, ${data.deal_id ?? null},
      COALESCE(${data.organisation_id ?? null}::uuid, (SELECT organisation_id FROM deals WHERE id = ${data.deal_id ?? null}::uuid)),
      ${data.talent_ids}::uuid[], ${data.attendees ?? null}, ${actor.userId}, ${actor.name}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateMeeting(id: string, data: MeetingInput): Promise<void> {
  await sql`
    UPDATE meetings SET
      title = ${data.title},
      starts_at = ${data.starts_at},
      ends_at = ${data.ends_at ?? null},
      location = ${data.location ?? null},
      deal_id = ${data.deal_id ?? null},
      organisation_id = COALESCE(${data.organisation_id ?? null}::uuid, (SELECT organisation_id FROM deals WHERE id = ${data.deal_id ?? null}::uuid)),
      talent_ids = ${data.talent_ids}::uuid[],
      attendees = ${data.attendees ?? null},
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

/**
 * Save the transcript and/or the reviewed notes. Action items keep the task
 * links they already have: a person can't detach an item from its task.
 */
export async function saveMeetingNotes(actor: CrmActor, current: Meeting, data: NotesInput): Promise<void> {
  const has = (key: keyof NotesInput) => Object.prototype.hasOwnProperty.call(data, key);
  const transcriptChanged = has('transcript') && (data.transcript ?? null) !== current.transcript;
  const notesChanged = has('summary') || has('decisions') || has('action_items');

  const items: MeetingActionItem[] | null = data.action_items
    ? data.action_items.map((item) => {
        const existing = current.action_items.find((i) => i.id === item.id);
        return {
          id: item.id,
          title: item.title,
          owner_name: item.owner_name ?? null,
          owner_user_id: item.owner_user_id ?? null,
          due_date: item.due_date ?? null,
          task_activity_id: existing?.task_activity_id ?? null,
        };
      })
    : null;

  await sql`
    UPDATE meetings SET
      transcript = ${transcriptChanged ? data.transcript || null : current.transcript},
      transcript_consent_at = CASE WHEN ${transcriptChanged && Boolean(data.transcript)} THEN NOW()
                                   WHEN ${transcriptChanged} THEN NULL ELSE transcript_consent_at END,
      transcript_consent_by = CASE WHEN ${transcriptChanged && Boolean(data.transcript)} THEN ${actor.userId}::uuid
                                   WHEN ${transcriptChanged} THEN NULL ELSE transcript_consent_by END,
      summary = ${has('summary') ? data.summary ?? null : current.summary},
      decisions = ${JSON.stringify(data.decisions ?? current.decisions)}::jsonb,
      action_items = ${JSON.stringify(items ?? current.action_items)}::jsonb,
      notes_reviewed_at = CASE WHEN ${notesChanged} THEN NOW() ELSE notes_reviewed_at END,
      notes_reviewed_by_name = CASE WHEN ${notesChanged} THEN ${actor.name} ELSE notes_reviewed_by_name END,
      updated_at = NOW()
    WHERE id = ${current.id}
  `;
}

/**
 * Start a drafting job: returns the one-off token the job must present, or
 * null if a job is already running (and not stale).
 */
export async function requestMeetingNotes(id: string, staleMinutes: number): Promise<string | null> {
  const token = randomBytes(24).toString('hex');
  const rows = await sql`
    UPDATE meetings SET
      ai_status = 'pending', ai_job_token = ${token}, ai_requested_at = NOW(), ai_error = NULL, updated_at = NOW()
    WHERE id = ${id}
      AND transcript IS NOT NULL
      AND (ai_status <> 'pending' OR ai_requested_at < NOW() - make_interval(mins => ${staleMinutes}))
    RETURNING id
  `;
  return rows.length > 0 ? token : null;
}

/** Record that a job couldn't be started (only if it's still this job) */
export async function failMeetingNotesStart(id: string, token: string, message: string): Promise<void> {
  await sql`
    UPDATE meetings SET ai_status = 'failed', ai_error = ${message}, ai_job_token = NULL
    WHERE id = ${id} AND ai_job_token = ${token}
  `;
}

export async function deleteMeeting(id: string): Promise<void> {
  await sql`DELETE FROM meetings WHERE id = ${id}`;
}

/**
 * Turn action items into CRM tasks, once each. The tasks go on the meeting's
 * deal (or client), to the item's owner (or whoever clicked), due at 10:00 UK
 * time on the item's date, or a week after the meeting when it has none.
 *
 * One statement: the meeting row is locked, so two clicks at once can't make
 * the same task twice. Returns how many tasks were created.
 */
export async function createTasksFromActionItems(actor: CrmActor, meetingId: string, itemIds: string[]): Promise<number> {
  const rows = await sql`
    WITH m AS (
      SELECT id, title, deal_id, organisation_id, starts_at, action_items
      FROM meetings WHERE id = ${meetingId} FOR UPDATE
    ),
    items AS (
      SELECT item, gen_random_uuid() AS activity_id
      FROM m, jsonb_array_elements(m.action_items) AS item
      WHERE item->>'id' = ANY(${itemIds}::text[])
        AND COALESCE(item->>'task_activity_id', '') = ''
    ),
    inserted AS (
      INSERT INTO activities (id, type, subject, body, deal_id, organisation_id, due_at, owner_user_id, created_by, created_by_name)
      SELECT
        items.activity_id, 'task', items.item->>'title', 'From the meeting “' || m.title || '”',
        m.deal_id, m.organisation_id,
        (COALESCE(NULLIF(items.item->>'due_date', '')::date, (m.starts_at AT TIME ZONE 'Europe/London')::date + 7)
          + TIME '10:00') AT TIME ZONE 'Europe/London',
        COALESCE(NULLIF(items.item->>'owner_user_id', '')::uuid, ${actor.userId}::uuid),
        ${actor.userId}, ${actor.name}
      FROM items, m
      RETURNING id
    )
    UPDATE meetings SET
      action_items = (
        SELECT jsonb_agg(
          CASE WHEN i.activity_id IS NULL THEN e.item
               ELSE e.item || jsonb_build_object('task_activity_id', i.activity_id) END
          ORDER BY e.ord)
        FROM jsonb_array_elements(meetings.action_items) WITH ORDINALITY AS e(item, ord)
        LEFT JOIN items i ON i.item->>'id' = e.item->>'id'
      ),
      updated_at = NOW()
    WHERE id = ${meetingId} AND EXISTS (SELECT 1 FROM items)
    RETURNING (SELECT count(*) FROM inserted)::int AS created
  `;
  return rows[0]?.created ?? 0;
}
