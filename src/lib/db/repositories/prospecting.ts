import { sql } from '../client';
import { contactVisible, type CrmActor, type CrmScope } from './crm';
import type {
  Campaign,
  CampaignDetail,
  CampaignStatus,
  DueItem,
  Enrolment,
  Outcome,
  ProspectCandidate,
  ProspectStep,
} from '@/lib/prospecting/types';

/**
 * Prospecting campaigns (CRM outreach v1).
 *
 * Campaigns are agency-wide: every CRM user can see them. What a person
 * can enrol, see in a campaign and work on is limited to the contacts their
 * CRM scope allows (contactVisible). Nothing is sent from here: steps are
 * marked done by the person who sent them.
 */

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function ref(id: unknown, name: unknown) {
  return id ? { id: String(id), name: String(name ?? '') } : null;
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

const campaignSelect = () => sql`
  SELECT
    pc.*,
    u.name AS owner_name,
    COALESCE(
      (SELECT json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name) FROM talents t WHERE t.id = ANY(pc.talent_ids)),
      '[]'
    ) AS talents,
    (SELECT json_build_object(
       'enrolled', COUNT(*),
       'active', COUNT(*) FILTER (WHERE e.status = 'active'),
       'contacted', COUNT(*) FILTER (WHERE e.first_contacted_at IS NOT NULL),
       'replied', COUNT(*) FILTER (WHERE e.status IN ('replied', 'meeting')),
       'meetings', COUNT(*) FILTER (WHERE e.status = 'meeting'),
       'not_interested', COUNT(*) FILTER (WHERE e.status = 'not_interested'),
       'due_now', COUNT(*) FILTER (WHERE e.status = 'active' AND pc.status = 'active' AND e.next_due_at <= NOW())
     ) FROM prospect_enrolments e WHERE e.campaign_id = pc.id) AS stats
  FROM prospect_campaigns pc
  LEFT JOIN users u ON u.id = pc.owner_user_id
`;

function mapCampaign(row: any): Campaign {
  const stats = row.stats ?? {};
  const n = (key: string) => Number(stats[key] ?? 0);
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    status: row.status,
    talents: row.talents ?? [],
    owner: ref(row.owner_user_id, row.owner_name),
    created_by: row.created_by,
    created_by_name: row.created_by_name,
    activated_at: iso(row.activated_at),
    created_at: iso(row.created_at)!,
    stats: {
      enrolled: n('enrolled'),
      active: n('active'),
      contacted: n('contacted'),
      replied: n('replied'),
      meetings: n('meetings'),
      not_interested: n('not_interested'),
      due_now: n('due_now'),
    },
  };
}

function mapStep(row: any): ProspectStep {
  return {
    id: row.id,
    position: Number(row.position),
    delay_days: Number(row.delay_days),
    channel: row.channel,
    subject: row.subject,
    body: row.body,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await sql`
    ${campaignSelect()}
    ORDER BY CASE pc.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END, pc.created_at DESC
  `;
  return rows.map(mapCampaign);
}

export async function getCampaign(scope: CrmScope, id: string): Promise<CampaignDetail | null> {
  const rows = await sql`${campaignSelect()} WHERE pc.id = ${id}`;
  if (!rows[0]) return null;
  const [steps, enrolments] = await Promise.all([
    sql`SELECT * FROM prospect_steps WHERE campaign_id = ${id} ORDER BY position`,
    sql`
      SELECT e.*, c.name AS contact_name, c.email AS contact_email, o.id AS org_id, o.name AS org_name,
             u.name AS owner_name, d.title AS deal_title
      FROM prospect_enrolments e
      JOIN contacts c ON c.id = e.contact_id
      LEFT JOIN organisations o ON o.id = c.organisation_id
      LEFT JOIN users u ON u.id = e.owner_user_id
      LEFT JOIN deals d ON d.id = e.deal_id
      WHERE e.campaign_id = ${id} AND ${contactVisible(scope)}
      ORDER BY (e.status = 'active') DESC, e.next_due_at NULLS LAST, c.name
    `,
  ]);
  return {
    ...mapCampaign(rows[0]),
    steps: steps.map(mapStep),
    enrolments: enrolments.map(
      (row: any): Enrolment => ({
        id: row.id,
        contact: { id: row.contact_id, name: row.contact_name, email: row.contact_email },
        organisation: ref(row.org_id, row.org_name),
        owner: ref(row.owner_user_id, row.owner_name),
        next_step: Number(row.next_step),
        next_due_at: iso(row.next_due_at),
        status: row.status,
        status_changed_at: iso(row.status_changed_at)!,
        first_contacted_at: iso(row.first_contacted_at),
        deal: ref(row.deal_id, row.deal_title),
      })
    ),
  };
}

export async function createCampaign(
  actor: CrmActor,
  data: { name: string; goal?: string | null; talent_ids: string[]; owner_user_id?: string | null },
  steps: ProspectStep[]
): Promise<string> {
  const rows = await sql`
    INSERT INTO prospect_campaigns (name, goal, talent_ids, owner_user_id, created_by, created_by_name)
    VALUES (${data.name}, ${data.goal ?? null}, ${data.talent_ids}::uuid[], ${data.owner_user_id ?? actor.userId}, ${actor.userId}, ${actor.name})
    RETURNING id
  `;
  const id = rows[0].id;
  await replaceSteps(id, steps);
  return id;
}

/**
 * Change a campaign's details or status. Activating sets every waiting
 * contact's first step due (after the first step's delay).
 */
export async function updateCampaign(
  id: string,
  changes: { name?: string; goal?: string | null; talent_ids?: string[]; owner_user_id?: string | null; status?: CampaignStatus }
): Promise<void> {
  const has = (key: keyof typeof changes) => Object.prototype.hasOwnProperty.call(changes, key);
  await sql`
    UPDATE prospect_campaigns SET
      name = COALESCE(${changes.name ?? null}, name),
      goal = CASE WHEN ${has('goal')} THEN ${changes.goal ?? null} ELSE goal END,
      talent_ids = COALESCE(${changes.talent_ids ?? null}::uuid[], talent_ids),
      owner_user_id = CASE WHEN ${has('owner_user_id')} THEN ${changes.owner_user_id ?? null}::uuid ELSE owner_user_id END,
      status = COALESCE(${changes.status ?? null}, status),
      activated_at = CASE WHEN ${changes.status ?? null} = 'active' THEN COALESCE(activated_at, NOW()) ELSE activated_at END,
      updated_at = NOW()
    WHERE id = ${id}
  `;
  if (changes.status === 'active') await scheduleWaiting(id);
}

/** Give active enrolments without a due date their next step's due date */
async function scheduleWaiting(campaignId: string): Promise<void> {
  await sql`
    UPDATE prospect_enrolments e SET
      next_due_at = NOW() + make_interval(days => s.delay_days),
      updated_at = NOW()
    FROM prospect_steps s
    WHERE e.campaign_id = ${campaignId} AND e.status = 'active' AND e.next_due_at IS NULL
      AND s.campaign_id = e.campaign_id AND s.position = e.next_step
  `;
}

/** Replace the sequence. Contacts past the new last step finish the sequence. */
export async function replaceSteps(campaignId: string, steps: ProspectStep[]): Promise<void> {
  const ordered = [...steps].sort((a, b) => a.position - b.position).map((s, i) => ({ ...s, position: i + 1 }));
  await sql.transaction([
    sql`DELETE FROM prospect_steps WHERE campaign_id = ${campaignId}`,
    ...ordered.map(
      (s) => sql`
        INSERT INTO prospect_steps (campaign_id, position, delay_days, channel, subject, body)
        VALUES (${campaignId}, ${s.position}, ${s.delay_days}, ${s.channel}, ${s.subject ?? null}, ${s.body})
      `
    ),
    sql`
      UPDATE prospect_enrolments SET status = 'completed', status_changed_at = NOW(), next_due_at = NULL, updated_at = NOW()
      WHERE campaign_id = ${campaignId} AND status = 'active' AND next_step > ${ordered.length}
    `,
  ]);
}

export async function deleteCampaign(id: string): Promise<void> {
  await sql`DELETE FROM prospect_campaigns WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// Enrolling contacts
// ---------------------------------------------------------------------------

/** Contacts the person may enrol, filtered like a segment */
export async function listCandidates(
  scope: CrmScope,
  campaignId: string,
  filters: { q?: string; orgType?: string; tag?: string; city?: string }
): Promise<ProspectCandidate[]> {
  const q = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const rows = await sql`
    SELECT c.id, c.name, c.email, c.job_title, c.do_not_contact, c.is_sole_trader, c.lawful_basis,
           o.id AS org_id, o.name AS org_name, o.type AS org_type, o.city AS org_city, o.tags AS org_tags,
           EXISTS (SELECT 1 FROM prospect_enrolments e WHERE e.campaign_id = ${campaignId} AND e.contact_id = c.id) AS already_enrolled
    FROM contacts c
    LEFT JOIN organisations o ON o.id = c.organisation_id
    WHERE ${contactVisible(scope)}
      AND (${q}::text IS NULL OR c.name ILIKE ${q} OR c.email ILIKE ${q} OR o.name ILIKE ${q})
      AND (${filters.orgType ?? null}::text IS NULL OR o.type = ${filters.orgType ?? null})
      AND (${filters.tag ?? null}::text IS NULL OR ${filters.tag ?? null} = ANY(o.tags))
      AND (${filters.city ?? null}::text IS NULL OR lower(o.city) = lower(${filters.city ?? null}))
    ORDER BY o.name NULLS LAST, c.name
    LIMIT 300
  `;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    job_title: row.job_title,
    organisation: row.org_id
      ? { id: row.org_id, name: row.org_name, type: row.org_type, city: row.org_city, tags: row.org_tags ?? [] }
      : null,
    do_not_contact: row.do_not_contact,
    is_sole_trader: Boolean(row.is_sole_trader),
    lawful_basis: row.lawful_basis,
    already_enrolled: row.already_enrolled,
  }));
}

/**
 * Enrol contacts the person may see, skipping do-not-contact ones and anyone
 * already in the campaign. Returns how many were added.
 */
export async function enrolContacts(scope: CrmScope, actor: CrmActor, campaignId: string, contactIds: string[]): Promise<number> {
  const rows = await sql`
    INSERT INTO prospect_enrolments (campaign_id, contact_id, owner_user_id, next_due_at)
    SELECT
      pc.id, c.id, COALESCE(pc.owner_user_id, ${actor.userId}::uuid),
      CASE WHEN pc.status = 'active' THEN NOW() + make_interval(days => COALESCE(s.delay_days, 0)) ELSE NULL END
    FROM prospect_campaigns pc
    JOIN contacts c ON c.id = ANY(${contactIds}::uuid[])
    LEFT JOIN organisations o ON o.id = c.organisation_id
    LEFT JOIN prospect_steps s ON s.campaign_id = pc.id AND s.position = 1
    WHERE pc.id = ${campaignId} AND NOT c.do_not_contact AND ${contactVisible(scope)}
    ON CONFLICT (campaign_id, contact_id) DO NOTHING
    RETURNING id
  `;
  return rows.length;
}

/** Take a contact out of a campaign (only while they haven't been contacted) or stop them */
export async function removeEnrolment(scope: CrmScope, enrolmentId: string): Promise<boolean> {
  const rows = await sql`
    WITH target AS (
      SELECT e.id, e.first_contacted_at FROM prospect_enrolments e
      JOIN contacts c ON c.id = e.contact_id
      WHERE e.id = ${enrolmentId} AND ${contactVisible(scope)}
    ),
    removed AS (
      DELETE FROM prospect_enrolments WHERE id IN (SELECT id FROM target WHERE first_contacted_at IS NULL) RETURNING id
    ),
    stopped AS (
      UPDATE prospect_enrolments SET status = 'stopped', status_changed_at = NOW(), next_due_at = NULL, updated_at = NOW()
      WHERE id IN (SELECT id FROM target WHERE first_contacted_at IS NOT NULL) AND status = 'active'
      RETURNING id
    )
    SELECT (SELECT COUNT(*) FROM target) AS found
  `;
  return Number(rows[0]?.found ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Working the queue
// ---------------------------------------------------------------------------

/** Steps due by the end of today (UK), for one person or everyone in scope */
export async function listDue(scope: CrmScope, ownerId: string | null): Promise<DueItem[]> {
  const rows = await sql`
    SELECT
      e.id AS enrolment_id, e.next_due_at, e.owner_user_id, u.name AS owner_name,
      pc.id AS campaign_id, pc.name AS campaign_name,
      s.id AS step_id, s.position, s.delay_days, s.channel, s.subject, s.body,
      (SELECT COUNT(*) FROM prospect_steps s2 WHERE s2.campaign_id = pc.id) AS total_steps,
      c.id AS contact_id, c.name AS contact_name, c.email, c.phone, c.job_title, c.linkedin_url, c.instagram,
      c.is_sole_trader, c.lawful_basis,
      o.id AS org_id, o.name AS org_name,
      COALESCE(
        (SELECT json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name) FROM talents t WHERE t.id = ANY(pc.talent_ids)),
        '[]'
      ) AS talents
    FROM prospect_enrolments e
    JOIN prospect_campaigns pc ON pc.id = e.campaign_id AND pc.status = 'active'
    JOIN prospect_steps s ON s.campaign_id = pc.id AND s.position = e.next_step
    JOIN contacts c ON c.id = e.contact_id AND NOT c.do_not_contact
    LEFT JOIN organisations o ON o.id = c.organisation_id
    LEFT JOIN users u ON u.id = e.owner_user_id
    WHERE e.status = 'active'
      AND e.next_due_at < ((NOW() AT TIME ZONE 'Europe/London')::date + 1) AT TIME ZONE 'Europe/London'
      AND (${ownerId}::uuid IS NULL OR e.owner_user_id = ${ownerId})
      AND ${contactVisible(scope)}
    ORDER BY e.next_due_at, c.name
    LIMIT 300
  `;
  return rows.map((row: any) => ({
    enrolment_id: row.enrolment_id,
    campaign: { id: row.campaign_id, name: row.campaign_name },
    step: mapStep({ ...row, id: row.step_id }),
    total_steps: Number(row.total_steps),
    due_at: iso(row.next_due_at)!,
    contact: {
      id: row.contact_id,
      name: row.contact_name,
      email: row.email,
      phone: row.phone,
      job_title: row.job_title,
      linkedin_url: row.linkedin_url,
      instagram: row.instagram,
      is_sole_trader: Boolean(row.is_sole_trader),
      lawful_basis: row.lawful_basis,
    },
    organisation: ref(row.org_id, row.org_name),
    talents: row.talents ?? [],
    owner: ref(row.owner_user_id, row.owner_name),
  }));
}

export async function countDue(scope: CrmScope, ownerId: string | null): Promise<number> {
  return (await listDue(scope, ownerId)).length;
}

interface EnrolmentRow {
  id: string;
  campaign_id: string;
  campaign_name: string;
  talent_ids: string[];
  contact_id: string;
  contact_name: string;
  organisation_id: string | null;
  organisation_name: string | null;
  next_step: number;
  status: string;
  deal_id: string | null;
}

async function getEnrolmentRow(scope: CrmScope, id: string): Promise<EnrolmentRow | null> {
  const rows = await sql`
    SELECT e.id, e.campaign_id, pc.name AS campaign_name, pc.talent_ids, e.contact_id, c.name AS contact_name,
           c.organisation_id, o.name AS organisation_name, e.next_step, e.status, e.deal_id
    FROM prospect_enrolments e
    JOIN prospect_campaigns pc ON pc.id = e.campaign_id
    JOIN contacts c ON c.id = e.contact_id
    LEFT JOIN organisations o ON o.id = c.organisation_id
    WHERE e.id = ${id} AND ${contactVisible(scope)}
  `;
  return (rows[0] as EnrolmentRow) ?? null;
}

const ACTIVITY_TYPE: Record<string, 'email' | 'call' | 'note'> = { email: 'email', call: 'call', linkedin: 'note', instagram: 'note' };

/**
 * Mark the current step sent (or skipped) and move to the next one. The
 * step number must match, so a double click can't skip a step. Sent steps
 * are logged on the contact's timeline with the message.
 */
export async function completeStep(
  scope: CrmScope,
  actor: CrmActor,
  enrolmentId: string,
  input: { step: number; outcome: 'sent' | 'skipped'; message?: string | null; note?: string | null }
): Promise<'done' | 'not_found' | 'stale'> {
  const enrolment = await getEnrolmentRow(scope, enrolmentId);
  if (!enrolment) return 'not_found';

  const rows = await sql`
    WITH current_step AS (
      SELECT channel FROM prospect_steps WHERE campaign_id = ${enrolment.campaign_id} AND position = ${input.step}
    ),
    next_step AS (
      SELECT delay_days FROM prospect_steps WHERE campaign_id = ${enrolment.campaign_id} AND position = ${input.step + 1}
    ),
    moved AS (
      UPDATE prospect_enrolments SET
        next_step = ${input.step + 1},
        next_due_at = NOW() + make_interval(days => (SELECT delay_days FROM next_step)),
        status = CASE WHEN EXISTS (SELECT 1 FROM next_step) THEN 'active' ELSE 'completed' END,
        status_changed_at = CASE WHEN EXISTS (SELECT 1 FROM next_step) THEN status_changed_at ELSE NOW() END,
        first_contacted_at = CASE WHEN ${input.outcome} = 'sent' THEN COALESCE(first_contacted_at, NOW()) ELSE first_contacted_at END,
        updated_at = NOW()
      WHERE id = ${enrolmentId} AND status = 'active' AND next_step = ${input.step}
      RETURNING id
    )
    INSERT INTO prospect_touches (enrolment_id, step_position, channel, outcome, note, done_by, done_by_name)
    SELECT ${enrolmentId}, ${input.step}, (SELECT channel FROM current_step), ${input.outcome}, ${input.note ?? null}, ${actor.userId}, ${actor.name}
    WHERE EXISTS (SELECT 1 FROM moved)
    RETURNING channel
  `;
  if (rows.length === 0) return 'stale';

  if (input.outcome === 'sent') {
    const channel = String(rows[0].channel);
    await sql`
      INSERT INTO activities (type, subject, body, organisation_id, contact_id, completed_at, owner_user_id, created_by, created_by_name)
      VALUES (
        ${ACTIVITY_TYPE[channel] ?? 'note'},
        ${`Prospecting: ${channel === 'linkedin' ? 'LinkedIn message' : channel === 'instagram' ? 'Instagram DM' : channel === 'call' ? 'call' : 'email'} (${enrolment.campaign_name}, step ${input.step})`},
        ${input.message ?? input.note ?? null}, ${enrolment.organisation_id}, ${enrolment.contact_id},
        NOW(), ${actor.userId}, ${actor.userId}, ${actor.name}
      )
    `;
  }
  return 'done';
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  replied: 'replied',
  meeting: 'booked a meeting',
  not_interested: 'not interested',
  bounced: 'email bounced',
  unsubscribed: 'asked not to be contacted',
};

/**
 * Record how the contact responded; this ends their sequence. Unsubscribed
 * marks the contact do-not-contact everywhere.
 */
export async function recordOutcome(
  scope: CrmScope,
  actor: CrmActor,
  enrolmentId: string,
  outcome: Outcome,
  note: string | null
): Promise<boolean> {
  const enrolment = await getEnrolmentRow(scope, enrolmentId);
  if (!enrolment) return false;

  await sql`
    UPDATE prospect_enrolments SET status = ${outcome}, status_changed_at = NOW(), next_due_at = NULL, updated_at = NOW()
    WHERE id = ${enrolmentId}
  `;
  if (outcome === 'unsubscribed') {
    await sql`UPDATE contacts SET do_not_contact = true, updated_at = NOW() WHERE id = ${enrolment.contact_id}`;
    await sql`
      UPDATE prospect_enrolments SET status = 'stopped', status_changed_at = NOW(), next_due_at = NULL, updated_at = NOW()
      WHERE contact_id = ${enrolment.contact_id} AND status = 'active'
    `;
  }
  await sql`
    INSERT INTO activities (type, subject, body, organisation_id, contact_id, completed_at, owner_user_id, created_by, created_by_name)
    VALUES ('note', ${`Prospecting: ${OUTCOME_LABEL[outcome]} (${enrolment.campaign_name})`}, ${note}, ${enrolment.organisation_id},
            ${enrolment.contact_id}, NOW(), ${actor.userId}, ${actor.userId}, ${actor.name})
  `;
  return true;
}

/** Turn a reply or meeting into a deal (once); returns the deal id */
export async function createDealFromEnrolment(
  scope: CrmScope,
  actor: CrmActor,
  enrolmentId: string
): Promise<{ dealId: string } | { error: string }> {
  const enrolment = await getEnrolmentRow(scope, enrolmentId);
  if (!enrolment) return { error: 'Not found' };
  if (enrolment.deal_id) return { dealId: enrolment.deal_id };

  const title = `${enrolment.organisation_name ?? enrolment.contact_name}: ${enrolment.campaign_name}`;
  const rows = await sql`
    WITH deal AS (
      INSERT INTO deals (title, organisation_id, contact_id, stage, source, talent_ids, owner_user_id, created_by)
      VALUES (${title}, ${enrolment.organisation_id}, ${enrolment.contact_id},
              ${enrolment.status === 'meeting' ? 'qualified' : 'lead'}, 'outreach', ${enrolment.talent_ids}::uuid[],
              ${actor.userId}, ${actor.userId})
      RETURNING id
    )
    UPDATE prospect_enrolments SET deal_id = (SELECT id FROM deal), updated_at = NOW()
    WHERE id = ${enrolmentId} AND deal_id IS NULL
    RETURNING deal_id
  `;
  const dealId = rows[0]?.deal_id;
  if (!dealId) {
    const again = await getEnrolmentRow(scope, enrolmentId);
    return again?.deal_id ? { dealId: again.deal_id } : { error: "Couldn't create the deal" };
  }
  await sql`
    INSERT INTO activities (type, subject, body, deal_id, organisation_id, contact_id, completed_at, owner_user_id, created_by, created_by_name)
    VALUES ('system', ${`Deal created from prospecting (${enrolment.campaign_name})`}, NULL, ${dealId}, ${enrolment.organisation_id},
            ${enrolment.contact_id}, NOW(), ${actor.userId}, ${actor.userId}, ${actor.name})
  `;
  return { dealId };
}
