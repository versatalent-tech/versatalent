import { sql } from '../client';
import { getTalentScope } from './team';
import type { TeamRole } from '@/lib/auth/permissions';
import {
  OPEN_STAGES,
  STAGE_LABELS,
  STALE_DEAL_DAYS,
  type Activity,
  type Contact,
  type CrmOptions,
  type Deal,
  type DealStage,
  type Enquiry,
  type EnquiryStatus,
  type Organisation,
} from '@/lib/crm/types';
import type { z } from 'zod';
import type {
  activitySchema,
  activityUpdateSchema,
  contactSchema,
  dealSchema,
  enquiryConvertSchema,
  organisationSchema,
} from '@/lib/crm/schemas';

/**
 * CRM data access. Every read and write takes a CrmScope built from the
 * session (never from the request), and every query applies it:
 *
 * - admins see everything;
 * - managers see deals they own or created, or that involve a talent assigned
 *   to them, plus the organisations, contacts and activities around those
 *   deals and anything they own or created themselves.
 */

export interface CrmScope {
  all: boolean;
  userId: string | null; // null for the env-configured admin
  name: string | null;
  talentIds: string[];
}

export interface CrmActor {
  userId: string | null;
  name: string | null;
}

export async function getCrmScope(session: { userId?: string; name?: string; role: TeamRole }): Promise<CrmScope> {
  const scope = await getTalentScope(session);
  return {
    all: scope === 'all',
    userId: session.userId ?? null,
    name: session.name ?? null,
    talentIds: scope === 'all' ? [] : scope,
  };
}

// ---------------------------------------------------------------------------
// Visibility conditions (aliases are fixed: deals d, organisations o, contacts c)
// ---------------------------------------------------------------------------

function dealVisible(scope: CrmScope, alias: 'd' | 'd2' = 'd') {
  if (scope.all) return sql`TRUE`;
  const a = sql.unsafe(alias);
  return sql`(${a}.owner_user_id = ${scope.userId} OR ${a}.created_by = ${scope.userId} OR ${a}.talent_ids && ${scope.talentIds}::uuid[])`;
}

function orgVisible(scope: CrmScope) {
  if (scope.all) return sql`TRUE`;
  return sql`(
    o.owner_user_id = ${scope.userId} OR o.created_by = ${scope.userId}
    OR EXISTS (SELECT 1 FROM deals d2 WHERE d2.organisation_id = o.id AND ${dealVisible(scope, 'd2')})
  )`;
}

function contactVisible(scope: CrmScope) {
  if (scope.all) return sql`TRUE`;
  return sql`(
    c.owner_user_id = ${scope.userId} OR c.created_by = ${scope.userId}
    OR EXISTS (SELECT 1 FROM deals d2 WHERE (d2.contact_id = c.id OR (c.organisation_id IS NOT NULL AND d2.organisation_id = c.organisation_id)) AND ${dealVisible(scope, 'd2')})
  )`;
}

/** Talents a scoped person may put on a deal; admins may use any */
export function talentsAllowed(scope: CrmScope, talentIds: string[]): boolean {
  return scope.all || talentIds.every((id) => scope.talentIds.includes(id));
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function dateOnly(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    // DATE columns arrive as local-midnight Dates; format without shifting the day
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function ref(id: unknown, name: unknown) {
  return id ? { id: String(id), name: String(name ?? '') } : null;
}

const dealSelect = () => sql`
  SELECT
    d.*,
    o.name AS organisation_name,
    c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone,
    u.name AS owner_name,
    COALESCE(
      (SELECT json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
         FROM talents t WHERE t.id = ANY(d.talent_ids)),
      '[]'
    ) AS talents,
    (SELECT MAX(a.created_at) FROM activities a WHERE a.deal_id = d.id) AS last_activity_at,
    (SELECT json_build_object('subject', a.subject, 'due_at', a.due_at)
       FROM activities a
      WHERE a.deal_id = d.id AND a.due_at IS NOT NULL AND a.completed_at IS NULL
      ORDER BY a.due_at ASC LIMIT 1) AS next_task
  FROM deals d
  LEFT JOIN organisations o ON o.id = d.organisation_id
  LEFT JOIN contacts c ON c.id = d.contact_id
  LEFT JOIN users u ON u.id = d.owner_user_id
`;

function mapDeal(row: any): Deal {
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    value_cents: row.value_cents === null ? null : Number(row.value_cents),
    currency: row.currency,
    expected_close: dateOnly(row.expected_close),
    source: row.source,
    lost_reason: row.lost_reason,
    notes: row.notes,
    organisation: ref(row.organisation_id, row.organisation_name),
    contact: row.contact_id
      ? { id: row.contact_id, name: row.contact_name, email: row.contact_email, phone: row.contact_phone }
      : null,
    owner: ref(row.owner_user_id, row.owner_name),
    talents: row.talents ?? [],
    stage_changed_at: iso(row.stage_changed_at)!,
    closed_at: iso(row.closed_at),
    last_activity_at: iso(row.last_activity_at),
    next_task: row.next_task ? { subject: row.next_task.subject, due_at: iso(row.next_task.due_at)! } : null,
    created_at: iso(row.created_at)!,
  };
}

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    body: row.body,
    due_at: iso(row.due_at),
    completed_at: iso(row.completed_at),
    owner: ref(row.owner_user_id, row.owner_name),
    created_by: row.created_by,
    created_by_name: row.created_by_name,
    deal: ref(row.deal_id, row.deal_title),
    organisation: ref(row.organisation_id, row.organisation_name),
    contact: ref(row.contact_id, row.contact_name),
    created_at: iso(row.created_at)!,
  };
}

// ---------------------------------------------------------------------------
// Options for pickers
// ---------------------------------------------------------------------------

export async function getCrmOptions(scope: CrmScope): Promise<CrmOptions> {
  const [owners, talents] = await Promise.all([
    sql`SELECT id, name FROM users WHERE role IN ('admin', 'manager') AND is_active ORDER BY name`,
    scope.all
      ? sql`SELECT id, name FROM talents ORDER BY is_active DESC, name`
      : sql`SELECT id, name FROM talents WHERE id = ANY(${scope.talentIds}::uuid[]) ORDER BY name`,
  ]);
  return {
    owners: owners.map((r: any) => ({ id: r.id, name: r.name })),
    talents: talents.map((r: any) => ({ id: r.id, name: r.name })),
  };
}

export async function isAssignableOwner(userId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM users WHERE id = ${userId} AND role IN ('admin', 'manager') AND is_active`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

/** Open deals, plus won/lost deals closed in the last 60 days */
export async function listDeals(scope: CrmScope, filters: { ownerId?: string; q?: string } = {}): Promise<Deal[]> {
  const q = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const rows = await sql`
    ${dealSelect()}
    WHERE ${dealVisible(scope)}
      AND (d.stage = ANY(${OPEN_STAGES}::text[]) OR d.closed_at > NOW() - INTERVAL '60 days')
      AND (${filters.ownerId ?? null}::uuid IS NULL OR d.owner_user_id = ${filters.ownerId ?? null})
      AND (${q}::text IS NULL OR d.title ILIKE ${q} OR o.name ILIKE ${q} OR c.name ILIKE ${q})
    ORDER BY d.stage_changed_at DESC
    LIMIT 500
  `;
  return rows.map(mapDeal);
}

export async function getDeal(scope: CrmScope, id: string): Promise<Deal | null> {
  const rows = await sql`${dealSelect()} WHERE d.id = ${id} AND ${dealVisible(scope)} LIMIT 1`;
  return rows[0] ? mapDeal(rows[0]) : null;
}

export async function listDealsForOrganisation(scope: CrmScope, organisationId: string): Promise<Deal[]> {
  const rows = await sql`
    ${dealSelect()}
    WHERE d.organisation_id = ${organisationId} AND ${dealVisible(scope)}
    ORDER BY d.created_at DESC
  `;
  return rows.map(mapDeal);
}

type DealInput = z.infer<typeof dealSchema>;

export async function createDeal(actor: CrmActor, data: DealInput): Promise<string> {
  const closed = data.stage === 'won' || data.stage === 'lost';
  const rows = await sql`
    INSERT INTO deals (
      title, organisation_id, contact_id, stage, value_cents, currency, expected_close, source,
      talent_ids, lost_reason, notes, owner_user_id, created_by, closed_at
    ) VALUES (
      ${data.title}, ${data.organisation_id ?? null}, ${data.contact_id ?? null}, ${data.stage},
      ${data.value_cents ?? null}, ${data.currency}, ${data.expected_close ?? null}, ${data.source},
      ${data.talent_ids}::uuid[], ${data.lost_reason ?? null}, ${data.notes ?? null},
      ${data.owner_user_id ?? actor.userId}, ${actor.userId}, ${closed ? new Date().toISOString() : null}
    )
    RETURNING id
  `;
  const id = rows[0].id;
  await addSystemActivity(actor, { deal_id: id, organisation_id: data.organisation_id ?? null }, 'system', 'Deal created');
  return id;
}

/**
 * Update a deal the scope can see. Stage moves are logged on the timeline and
 * keep stage_changed_at / closed_at right. Returns false when not visible.
 */
export async function updateDeal(
  scope: CrmScope,
  actor: CrmActor,
  id: string,
  changes: Partial<DealInput>
): Promise<boolean> {
  const current = await getDeal(scope, id);
  if (!current) return false;

  const stage = changes.stage ?? current.stage;
  const stageChanged = stage !== current.stage;
  const closedNow = stage === 'won' || stage === 'lost';
  const has = (key: keyof DealInput) => Object.prototype.hasOwnProperty.call(changes, key);

  await sql`
    UPDATE deals SET
      title = ${changes.title ?? current.title},
      organisation_id = ${has('organisation_id') ? changes.organisation_id ?? null : current.organisation?.id ?? null},
      contact_id = ${has('contact_id') ? changes.contact_id ?? null : current.contact?.id ?? null},
      stage = ${stage},
      value_cents = ${has('value_cents') ? changes.value_cents ?? null : current.value_cents},
      currency = ${changes.currency ?? current.currency},
      expected_close = ${has('expected_close') ? changes.expected_close ?? null : current.expected_close},
      source = ${changes.source ?? current.source},
      talent_ids = ${changes.talent_ids ?? current.talents.map((t) => t.id)}::uuid[],
      lost_reason = ${has('lost_reason') ? changes.lost_reason ?? null : current.lost_reason},
      notes = ${has('notes') ? changes.notes ?? null : current.notes},
      owner_user_id = ${has('owner_user_id') ? changes.owner_user_id ?? null : current.owner?.id ?? null},
      stage_changed_at = CASE WHEN ${stageChanged} THEN NOW() ELSE stage_changed_at END,
      closed_at = CASE
        WHEN NOT ${closedNow} THEN NULL
        WHEN ${stageChanged} THEN NOW()
        ELSE closed_at
      END,
      updated_at = NOW()
    WHERE id = ${id}
  `;

  if (stageChanged) {
    const reason = stage === 'lost' && changes.lost_reason ? ` (${changes.lost_reason})` : '';
    await addSystemActivity(
      actor,
      { deal_id: id, organisation_id: current.organisation?.id ?? null },
      'stage_change',
      `${STAGE_LABELS[current.stage]} → ${STAGE_LABELS[stage as DealStage]}${reason}`
    );
  }
  return true;
}

export async function deleteDeal(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM deals WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

const orgSelect = () => sql`
  SELECT
    o.*, u.name AS owner_name,
    (SELECT COUNT(*) FROM deals d WHERE d.organisation_id = o.id AND d.stage = ANY(${OPEN_STAGES}::text[])) AS open_deals,
    (SELECT COUNT(*) FROM contacts c WHERE c.organisation_id = o.id) AS contacts_count
  FROM organisations o
  LEFT JOIN users u ON u.id = o.owner_user_id
`;

function mapOrg(row: any): Organisation {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    website: row.website,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    notes: row.notes,
    tags: row.tags ?? [],
    owner: ref(row.owner_user_id, row.owner_name),
    open_deals: Number(row.open_deals),
    contacts_count: Number(row.contacts_count),
    created_at: iso(row.created_at)!,
    updated_at: iso(row.updated_at)!,
  };
}

export async function listOrganisations(scope: CrmScope, q?: string): Promise<Organisation[]> {
  const pattern = q?.trim() ? `%${q.trim()}%` : null;
  const rows = await sql`
    ${orgSelect()}
    WHERE ${orgVisible(scope)}
      AND (${pattern}::text IS NULL OR o.name ILIKE ${pattern} OR o.city ILIKE ${pattern} OR ${q?.trim() ?? ''} = ANY(o.tags))
    ORDER BY o.name
    LIMIT 500
  `;
  return rows.map(mapOrg);
}

export async function getOrganisation(scope: CrmScope, id: string): Promise<Organisation | null> {
  const rows = await sql`${orgSelect()} WHERE o.id = ${id} AND ${orgVisible(scope)} LIMIT 1`;
  return rows[0] ? mapOrg(rows[0]) : null;
}

export async function findVisibleOrganisationByName(scope: CrmScope, name: string): Promise<{ id: string; name: string } | null> {
  const rows = await sql`
    SELECT o.id, o.name FROM organisations o
    WHERE lower(o.name) = lower(${name.trim()}) AND ${orgVisible(scope)}
    LIMIT 1
  `;
  return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
}

type OrgInput = z.infer<typeof organisationSchema>;

export async function createOrganisation(actor: CrmActor, data: OrgInput): Promise<string> {
  const rows = await sql`
    INSERT INTO organisations (name, type, website, email, phone, city, country, notes, tags, owner_user_id, created_by)
    VALUES (
      ${data.name}, ${data.type}, ${data.website ?? null}, ${data.email ?? null}, ${data.phone ?? null},
      ${data.city ?? null}, ${data.country ?? null}, ${data.notes ?? null}, ${data.tags ?? []},
      ${data.owner_user_id ?? actor.userId}, ${actor.userId}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateOrganisation(scope: CrmScope, id: string, changes: Partial<OrgInput>): Promise<boolean> {
  const current = await getOrganisation(scope, id);
  if (!current) return false;
  const has = (key: keyof OrgInput) => Object.prototype.hasOwnProperty.call(changes, key);
  const pick = <K extends keyof OrgInput>(key: K, fallback: unknown) => (has(key) ? changes[key] ?? null : fallback);

  await sql`
    UPDATE organisations SET
      name = ${changes.name ?? current.name},
      type = ${changes.type ?? current.type},
      website = ${pick('website', current.website)},
      email = ${pick('email', current.email)},
      phone = ${pick('phone', current.phone)},
      city = ${pick('city', current.city)},
      country = ${pick('country', current.country)},
      notes = ${pick('notes', current.notes)},
      tags = ${changes.tags ?? current.tags},
      owner_user_id = ${pick('owner_user_id', current.owner?.id ?? null)},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  return true;
}

export async function deleteOrganisation(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM organisations WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const contactSelect = () => sql`
  SELECT c.*, o.name AS organisation_name
  FROM contacts c
  LEFT JOIN organisations o ON o.id = c.organisation_id
`;

function mapContact(row: any): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    lawful_basis: row.lawful_basis,
    do_not_contact: row.do_not_contact,
    notes: row.notes,
    organisation: ref(row.organisation_id, row.organisation_name),
    created_at: iso(row.created_at)!,
  };
}

export async function listContacts(scope: CrmScope, filters: { q?: string; organisationId?: string } = {}): Promise<Contact[]> {
  const pattern = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const rows = await sql`
    ${contactSelect()}
    WHERE ${contactVisible(scope)}
      AND (${filters.organisationId ?? null}::uuid IS NULL OR c.organisation_id = ${filters.organisationId ?? null})
      AND (${pattern}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR o.name ILIKE ${pattern})
    ORDER BY c.name
    LIMIT 500
  `;
  return rows.map(mapContact);
}

export async function getContact(scope: CrmScope, id: string): Promise<Contact | null> {
  const rows = await sql`${contactSelect()} WHERE c.id = ${id} AND ${contactVisible(scope)} LIMIT 1`;
  return rows[0] ? mapContact(rows[0]) : null;
}

/** Any contact with this email, regardless of scope (used to avoid duplicates) */
async function findContactIdByEmail(email: string): Promise<{ id: string; organisation_id: string | null } | null> {
  const rows = await sql`SELECT id, organisation_id FROM contacts WHERE lower(email) = lower(${email}) LIMIT 1`;
  return rows[0] ?? null;
}

export async function contactEmailTaken(email: string, exceptId?: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM contacts WHERE lower(email) = lower(${email}) AND (${exceptId ?? null}::uuid IS NULL OR id <> ${exceptId ?? null}) LIMIT 1
  `;
  return rows.length > 0;
}

type ContactInput = z.infer<typeof contactSchema>;

export async function createContact(actor: CrmActor, data: ContactInput): Promise<string> {
  const rows = await sql`
    INSERT INTO contacts (organisation_id, name, email, phone, job_title, lawful_basis, do_not_contact, notes, owner_user_id, created_by)
    VALUES (
      ${data.organisation_id ?? null}, ${data.name}, ${data.email ?? null}, ${data.phone ?? null}, ${data.job_title ?? null},
      ${data.lawful_basis}, ${data.do_not_contact}, ${data.notes ?? null}, ${actor.userId}, ${actor.userId}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateContact(scope: CrmScope, id: string, changes: Partial<ContactInput>): Promise<boolean> {
  const current = await getContact(scope, id);
  if (!current) return false;
  const has = (key: keyof ContactInput) => Object.prototype.hasOwnProperty.call(changes, key);
  const pick = <K extends keyof ContactInput>(key: K, fallback: unknown) => (has(key) ? changes[key] ?? null : fallback);

  await sql`
    UPDATE contacts SET
      name = ${changes.name ?? current.name},
      organisation_id = ${pick('organisation_id', current.organisation?.id ?? null)},
      email = ${pick('email', current.email)},
      phone = ${pick('phone', current.phone)},
      job_title = ${pick('job_title', current.job_title)},
      lawful_basis = ${changes.lawful_basis ?? current.lawful_basis},
      do_not_contact = ${changes.do_not_contact ?? current.do_not_contact},
      notes = ${pick('notes', current.notes)},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  return true;
}

export async function deleteContact(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM contacts WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Activities & tasks
// ---------------------------------------------------------------------------

const activitySelect = () => sql`
  SELECT a.*, u.name AS owner_name, d.title AS deal_title, o.name AS organisation_name, c.name AS contact_name
  FROM activities a
  LEFT JOIN users u ON u.id = a.owner_user_id
  LEFT JOIN deals d ON d.id = a.deal_id
  LEFT JOIN organisations o ON o.id = a.organisation_id
  LEFT JOIN contacts c ON c.id = a.contact_id
`;

/** Activities the scope may see: on a visible deal or organisation, or owned/created by them */
function activityVisible(scope: CrmScope) {
  if (scope.all) return sql`TRUE`;
  return sql`(
    a.owner_user_id = ${scope.userId} OR a.created_by = ${scope.userId}
    OR (a.deal_id IS NOT NULL AND ${dealVisible(scope)})
    OR (a.deal_id IS NULL AND a.organisation_id IS NOT NULL AND ${orgVisible(scope)})
  )`;
}

export async function listTimeline(scope: CrmScope, filters: { dealId?: string; organisationId?: string }): Promise<Activity[]> {
  const rows = await sql`
    ${activitySelect()}
    WHERE ${activityVisible(scope)}
      AND (${filters.dealId ?? null}::uuid IS NULL OR a.deal_id = ${filters.dealId ?? null})
      AND (${filters.organisationId ?? null}::uuid IS NULL OR a.organisation_id = ${filters.organisationId ?? null}
           OR a.deal_id IN (SELECT id FROM deals WHERE organisation_id = ${filters.organisationId ?? null}))
    ORDER BY COALESCE(a.completed_at, a.created_at) DESC
    LIMIT 200
  `;
  return rows.map(mapActivity);
}

/** Open tasks (and those finished in the last 7 days) for one person, or everyone the scope can see */
export async function listTasks(scope: CrmScope, ownerId: string | null): Promise<Activity[]> {
  const rows = await sql`
    ${activitySelect()}
    WHERE a.due_at IS NOT NULL
      AND ${activityVisible(scope)}
      AND (${ownerId}::uuid IS NULL OR a.owner_user_id = ${ownerId})
      AND (a.completed_at IS NULL OR a.completed_at > NOW() - INTERVAL '7 days')
    ORDER BY (a.completed_at IS NOT NULL), a.due_at ASC
    LIMIT 300
  `;
  return rows.map(mapActivity);
}

export async function getActivity(scope: CrmScope, id: string): Promise<Activity | null> {
  const rows = await sql`${activitySelect()} WHERE a.id = ${id} AND ${activityVisible(scope)} LIMIT 1`;
  return rows[0] ? mapActivity(rows[0]) : null;
}

type ActivityInput = z.infer<typeof activitySchema>;

export async function createActivity(actor: CrmActor, data: ActivityInput): Promise<string> {
  // Notes and calls are done as soon as they're logged; tasks are done when ticked off
  const completedAt = data.type === 'task' ? null : new Date().toISOString();
  const rows = await sql`
    INSERT INTO activities (type, subject, body, deal_id, organisation_id, contact_id, due_at, completed_at, owner_user_id, created_by, created_by_name)
    VALUES (
      ${data.type}, ${data.subject}, ${data.body ?? null}, ${data.deal_id ?? null},
      COALESCE(${data.organisation_id ?? null}::uuid, (SELECT organisation_id FROM deals WHERE id = ${data.deal_id ?? null}::uuid)),
      ${data.contact_id ?? null}, ${data.due_at ?? null}, ${completedAt},
      ${data.owner_user_id ?? actor.userId}, ${actor.userId}, ${actor.name}
    )
    RETURNING id
  `;
  return rows[0].id;
}

async function addSystemActivity(
  actor: CrmActor,
  links: { deal_id?: string | null; organisation_id?: string | null; contact_id?: string | null },
  type: 'system' | 'stage_change' | 'note',
  subject: string,
  body?: string | null
): Promise<void> {
  await sql`
    INSERT INTO activities (type, subject, body, deal_id, organisation_id, contact_id, completed_at, owner_user_id, created_by, created_by_name)
    VALUES (${type}, ${subject}, ${body ?? null}, ${links.deal_id ?? null}, ${links.organisation_id ?? null}, ${links.contact_id ?? null},
            NOW(), ${actor.userId}, ${actor.userId}, ${actor.name})
  `;
}

export async function updateActivity(
  scope: CrmScope,
  id: string,
  changes: z.infer<typeof activityUpdateSchema>
): Promise<boolean> {
  const current = await getActivity(scope, id);
  if (!current) return false;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(changes, key);

  const completedAt =
    changes.completed === undefined
      ? current.completed_at
      : changes.completed
        ? current.completed_at ?? new Date().toISOString()
        : null;

  await sql`
    UPDATE activities SET
      subject = ${changes.subject ?? current.subject},
      body = ${has('body') ? changes.body ?? null : current.body},
      due_at = ${has('due_at') ? changes.due_at ?? null : current.due_at},
      owner_user_id = ${has('owner_user_id') ? changes.owner_user_id ?? null : current.owner?.id ?? null},
      completed_at = ${completedAt}
    WHERE id = ${id}
  `;
  return true;
}

export async function deleteActivity(id: string): Promise<void> {
  await sql`DELETE FROM activities WHERE id = ${id} AND type NOT IN ('stage_change', 'system')`;
}

// ---------------------------------------------------------------------------
// Website enquiries
// ---------------------------------------------------------------------------

function mapEnquiry(row: any): Enquiry {
  return {
    id: row.id,
    form: row.form,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    subject: row.subject,
    message: row.message,
    payload: row.payload ?? {},
    status: row.status,
    deal: ref(row.deal_id, row.deal_title),
    handled_by_name: row.handled_by_name,
    handled_at: iso(row.handled_at),
    created_at: iso(row.created_at)!,
  };
}

export async function listEnquiries(status: EnquiryStatus | 'all'): Promise<Enquiry[]> {
  const rows = await sql`
    SELECT e.*, d.title AS deal_title, u.name AS handled_by_name
    FROM enquiries e
    LEFT JOIN deals d ON d.id = e.deal_id
    LEFT JOIN users u ON u.id = e.handled_by
    WHERE (${status} = 'all' OR e.status = ${status})
    ORDER BY e.created_at DESC
    LIMIT 300
  `;
  return rows.map(mapEnquiry);
}

export async function countEnquiries(): Promise<Record<EnquiryStatus, number>> {
  const rows = await sql`SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status`;
  const counts: Record<EnquiryStatus, number> = { new: 0, converted: 0, archived: 0, spam: 0 };
  for (const row of rows as any[]) counts[row.status as EnquiryStatus] = Number(row.n);
  return counts;
}

export async function getEnquiry(id: string): Promise<Enquiry | null> {
  const rows = await sql`
    SELECT e.*, d.title AS deal_title, u.name AS handled_by_name
    FROM enquiries e LEFT JOIN deals d ON d.id = e.deal_id LEFT JOIN users u ON u.id = e.handled_by
    WHERE e.id = ${id} LIMIT 1
  `;
  return rows[0] ? mapEnquiry(rows[0]) : null;
}

export async function setEnquiryStatus(actor: CrmActor, id: string, status: 'new' | 'archived' | 'spam'): Promise<boolean> {
  const rows = await sql`
    UPDATE enquiries SET
      status = ${status},
      handled_by = CASE WHEN ${status} = 'new' THEN NULL ELSE ${actor.userId}::uuid END,
      handled_at = CASE WHEN ${status} = 'new' THEN NULL ELSE NOW() END
    WHERE id = ${id} AND status <> 'converted'
    RETURNING id
  `;
  return rows.length > 0;
}

export interface NewEnquiry {
  form: 'contact' | 'brand' | 'talent';
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string | null;
  payload: Record<string, string>;
  ip: string;
}

export async function createEnquiry(data: NewEnquiry): Promise<void> {
  await sql`
    INSERT INTO enquiries (form, name, email, phone, company, subject, message, payload, ip)
    VALUES (${data.form}, ${data.name}, ${data.email}, ${data.phone}, ${data.company}, ${data.subject}, ${data.message},
            ${JSON.stringify(data.payload)}, ${data.ip})
  `;
}

export async function countRecentEnquiriesFromIp(ip: string): Promise<number> {
  const rows = await sql`SELECT COUNT(*) AS n FROM enquiries WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '1 hour'`;
  return Number(rows[0].n);
}

/**
 * Turn an enquiry into a deal: reuse the contact (by email) and organisation
 * (by name) when they already exist, otherwise create them. The enquiry is
 * claimed first so two people can't convert it twice.
 */
export async function convertEnquiry(
  scope: CrmScope,
  actor: CrmActor,
  id: string,
  input: z.infer<typeof enquiryConvertSchema>
): Promise<{ dealId: string } | { error: string }> {
  const claimed = await sql`
    UPDATE enquiries SET status = 'converted', handled_by = ${actor.userId}, handled_at = NOW()
    WHERE id = ${id} AND status IN ('new', 'archived')
    RETURNING *
  `;
  if (claimed.length === 0) {
    return { error: 'This enquiry has already been converted or no longer exists' };
  }
  const enquiry = claimed[0];

  try {
    let organisationId: string | null = null;
    let contactId: string | null = null;

    const existingContact = enquiry.email ? await findContactIdByEmail(enquiry.email) : null;
    if (existingContact) {
      contactId = existingContact.id;
      organisationId = existingContact.organisation_id;
    }

    if (!organisationId && input.organisation_name) {
      const existingOrg = await findVisibleOrganisationByName(scope, input.organisation_name);
      organisationId =
        existingOrg?.id ??
        (await createOrganisation(actor, { name: input.organisation_name, type: input.organisation_type }));
    }

    if (!contactId && (enquiry.name || enquiry.email)) {
      contactId = await createContact(actor, {
        name: enquiry.name || enquiry.email,
        email: enquiry.email,
        phone: enquiry.phone,
        organisation_id: organisationId,
        lawful_basis: 'legitimate_interest',
        do_not_contact: false,
        job_title: null,
        notes: null,
      });
    }

    const dealId = await createDeal(actor, {
      title: input.title,
      organisation_id: organisationId,
      contact_id: contactId,
      stage: 'lead',
      value_cents: input.value_cents ?? null,
      currency: 'GBP',
      expected_close: null,
      source: 'website_form',
      talent_ids: input.talent_ids,
      lost_reason: null,
      notes: null,
      owner_user_id: input.owner_user_id ?? actor.userId,
    });

    const original = [enquiry.subject && `Subject: ${enquiry.subject}`, enquiry.message].filter(Boolean).join('\n\n');
    await addSystemActivity(
      actor,
      { deal_id: dealId, organisation_id: organisationId, contact_id: contactId },
      'note',
      'Website enquiry',
      original || null
    );

    await sql`UPDATE enquiries SET deal_id = ${dealId} WHERE id = ${id}`;
    return { dealId };
  } catch (error) {
    // Put it back in the inbox so it isn't lost
    await sql`UPDATE enquiries SET status = ${enquiry.status}, handled_by = NULL, handled_at = NULL WHERE id = ${id}`;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Dashboard alerts
// ---------------------------------------------------------------------------

export interface CrmAttention {
  new_enquiries: number | null; // null when the person can't see enquiries
  overdue_tasks: number;
  stale_deals: number;
  open_deals: number;
}

export async function getCrmAttention(scope: CrmScope, includeEnquiries: boolean): Promise<CrmAttention> {
  const [enquiryRows, taskRows, dealRows] = await Promise.all([
    includeEnquiries ? sql`SELECT COUNT(*) AS n FROM enquiries WHERE status = 'new'` : Promise.resolve(null),
    scope.userId
      ? sql`
          SELECT COUNT(*) AS n FROM activities
          WHERE owner_user_id = ${scope.userId} AND due_at < NOW() AND completed_at IS NULL
        `
      : sql`SELECT COUNT(*) AS n FROM activities WHERE owner_user_id IS NULL AND due_at < NOW() AND completed_at IS NULL`,
    sql`
      SELECT
        COUNT(*) AS open_deals,
        COUNT(*) FILTER (WHERE d.stage_changed_at < NOW() - make_interval(days => ${STALE_DEAL_DAYS})
          AND NOT EXISTS (
            SELECT 1 FROM activities a WHERE a.deal_id = d.id
              AND a.created_at > NOW() - make_interval(days => ${STALE_DEAL_DAYS})
          )) AS stale
      FROM deals d
      WHERE d.stage = ANY(${OPEN_STAGES}::text[]) AND ${dealVisible(scope)}
    `,
  ]);

  return {
    new_enquiries: enquiryRows ? Number(enquiryRows[0].n) : null,
    overdue_tasks: Number(taskRows[0].n),
    stale_deals: Number(dealRows[0].stale),
    open_deals: Number(dealRows[0].open_deals),
  };
}
