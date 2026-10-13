import { sql } from '../client';
import type { BookingScope } from './bookings';
import type { DocumentItem, DocumentKind, ExpiringDocument, SharedDocument } from '@/lib/documents/types';

/**
 * Documents on bookings, deals and talent profiles. Rows only: the files
 * are in the private store (lib/services/document-storage) and access is
 * decided in lib/documents/access.
 */

export interface DocumentRow extends DocumentItem {
  blob_key: string;
  /** The talent the document concerns: the profile's, or the booking's (null on deal documents) */
  owner_talent_id: string | null;
}

/** What a person may list: which kinds, and whether admin-only documents are included */
export interface DocumentFilter {
  kinds: DocumentKind[] | null;
  includeAdminOnly: boolean;
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** DATE columns may arrive as local-midnight Dates; keep the calendar day */
function dateOnly(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

function mapDocument(row: any): DocumentItem {
  return {
    id: row.id,
    booking_id: row.booking_id,
    deal_id: row.deal_id,
    talent_id: row.talent_id,
    kind: row.kind,
    filename: row.filename,
    content_type: row.content_type,
    size_bytes: Number(row.size_bytes),
    visible_to_talent: row.visible_to_talent,
    admin_only: row.admin_only,
    is_public: row.is_public,
    expires_on: dateOnly(row.expires_on),
    delete_after: dateOnly(row.delete_after),
    ...(row.from_talent_profile ? { from_talent_profile: true } : {}),
    uploaded_by: row.uploaded_by,
    uploaded_by_name: row.uploaded_by_name,
    created_at: iso(row.created_at),
  };
}

export async function getDocumentRow(id: string): Promise<DocumentRow | null> {
  const rows = await sql`
    SELECT doc.*, COALESCE(doc.talent_id, b.talent_id) AS owner_talent_id
    FROM documents doc
    LEFT JOIN bookings b ON b.id = doc.booking_id
    WHERE doc.id = ${id}
  `;
  const row = rows[0];
  return row ? { ...mapDocument(row), blob_key: row.blob_key, owner_talent_id: row.owner_talent_id } : null;
}

/**
 * A booking's documents, if its talent is in scope, followed by the riders
 * on that talent's profile (read-only here; they're kept on the profile).
 */
export async function listBookingDocuments(scope: BookingScope, bookingId: string, filter: DocumentFilter): Promise<DocumentItem[]> {
  const rows = await sql`
    SELECT doc.*, (doc.talent_id IS NOT NULL) AS from_talent_profile
    FROM bookings b
    JOIN documents doc ON doc.booking_id = b.id OR (doc.talent_id = b.talent_id AND doc.kind = 'rider')
    WHERE b.id = ${bookingId}
      AND (${scope.all} OR b.talent_id = ANY(${scope.talentIds}::uuid[]))
      AND (${filter.kinds}::text[] IS NULL OR doc.kind = ANY(${filter.kinds}::text[]))
      AND (${filter.includeAdminOnly} OR NOT doc.admin_only)
    ORDER BY (doc.talent_id IS NOT NULL), doc.created_at DESC
  `;
  return rows.map(mapDocument);
}

/** A deal's documents (the caller checks the deal is visible) */
export async function listDealDocuments(dealId: string): Promise<DocumentItem[]> {
  const rows = await sql`SELECT * FROM documents WHERE deal_id = ${dealId} ORDER BY created_at DESC`;
  return rows.map(mapDocument);
}

/** A talent's profile documents (the caller checks the talent is in scope) */
export async function listTalentDocuments(talentId: string, filter: DocumentFilter): Promise<DocumentItem[]> {
  const rows = await sql`
    SELECT * FROM documents
    WHERE talent_id = ${talentId}
      AND (${filter.kinds}::text[] IS NULL OR kind = ANY(${filter.kinds}::text[]))
      AND (${filter.includeAdminOnly} OR NOT admin_only)
    ORDER BY created_at DESC
  `;
  return rows.map(mapDocument);
}

/** Profile documents shared with the talent, for their portal */
export async function listSharedTalentDocuments(talentId: string): Promise<SharedDocument[]> {
  const rows = await sql`
    SELECT id, kind, filename, expires_on FROM documents
    WHERE talent_id = ${talentId} AND visible_to_talent
    ORDER BY created_at DESC
  `;
  return rows.map((row: any) => ({ id: row.id, kind: row.kind, filename: row.filename, expires_on: dateOnly(row.expires_on) }));
}

/**
 * Talent documents that have expired, expire within `days`, or are past
 * their delete-after date, for the talents in scope.
 */
export async function listExpiringDocuments(scope: BookingScope, days: number, includeAdminOnly: boolean): Promise<ExpiringDocument[]> {
  const rows = await sql`
    SELECT doc.id, doc.kind, doc.filename, doc.expires_on, doc.delete_after, t.id AS talent_id, t.name AS talent_name
    FROM documents doc
    JOIN talents t ON t.id = doc.talent_id
    WHERE (${scope.all} OR doc.talent_id = ANY(${scope.talentIds}::uuid[]))
      AND (${includeAdminOnly} OR NOT doc.admin_only)
      AND (
        doc.expires_on <= (NOW() AT TIME ZONE 'Europe/London')::date + ${days}::int
        OR doc.delete_after <= (NOW() AT TIME ZONE 'Europe/London')::date
      )
    ORDER BY LEAST(doc.expires_on, doc.delete_after)
  `;
  return rows.map((row: any) => ({
    id: row.id,
    talent: { id: row.talent_id, name: row.talent_name },
    kind: row.kind,
    filename: row.filename,
    expires_on: dateOnly(row.expires_on),
    delete_after: dateOnly(row.delete_after),
  }));
}

export async function createDocument(data: {
  id: string;
  booking_id: string | null;
  deal_id: string | null;
  talent_id: string | null;
  kind: DocumentKind;
  filename: string;
  content_type: string;
  size_bytes: number;
  blob_key: string;
  visible_to_talent: boolean;
  admin_only: boolean;
  expires_on: string | null;
  delete_after: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
}): Promise<DocumentItem> {
  const rows = await sql`
    INSERT INTO documents (
      id, booking_id, deal_id, talent_id, kind, filename, content_type, size_bytes, blob_key,
      visible_to_talent, admin_only, expires_on, delete_after, uploaded_by, uploaded_by_name
    )
    VALUES (
      ${data.id}, ${data.booking_id}, ${data.deal_id}, ${data.talent_id}, ${data.kind}, ${data.filename},
      ${data.content_type}, ${data.size_bytes}, ${data.blob_key}, ${data.visible_to_talent}, ${data.admin_only},
      ${data.expires_on}, ${data.delete_after}, ${data.uploaded_by}, ${data.uploaded_by_name}
    )
    RETURNING *
  `;
  return mapDocument(rows[0]);
}

export interface DocumentChanges {
  kind?: DocumentKind;
  visible_to_talent?: boolean;
  admin_only?: boolean;
  is_public?: boolean;
  expires_on?: string | null;
  delete_after?: string | null;
}

/** Apply changes (the caller has checked who may make them) */
export async function updateDocument(current: DocumentItem, changes: DocumentChanges): Promise<DocumentItem | null> {
  const has = (key: keyof DocumentChanges) => Object.prototype.hasOwnProperty.call(changes, key);
  const kind = changes.kind ?? current.kind;
  const adminOnly = kind === 'id_document' || (changes.admin_only ?? current.admin_only);
  // Only a talent's comp card can be the public press kit, and never an admin-only one
  const isPublic = (changes.is_public ?? current.is_public) && Boolean(current.talent_id) && kind === 'comp_card' && !adminOnly;
  const rows = await sql`
    UPDATE documents SET
      kind = ${kind},
      visible_to_talent = CASE WHEN deal_id IS NOT NULL THEN false
                               ELSE ${changes.visible_to_talent ?? current.visible_to_talent} END,
      admin_only = ${adminOnly},
      is_public = ${isPublic},
      expires_on = ${has('expires_on') ? changes.expires_on ?? null : current.expires_on},
      delete_after = ${has('delete_after') ? changes.delete_after ?? null : current.delete_after}
    WHERE id = ${current.id}
    RETURNING *
  `;
  return rows[0] ? mapDocument(rows[0]) : null;
}

/** The talent's public press kit (latest public comp card), with its file key */
export async function getPublicPressKit(talentId: string): Promise<{ filename: string; content_type: string; blob_key: string } | null> {
  const rows = await sql`
    SELECT filename, content_type, blob_key FROM documents
    WHERE talent_id = ${talentId} AND is_public AND kind = 'comp_card' AND NOT admin_only
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? { filename: rows[0].filename, content_type: rows[0].content_type, blob_key: rows[0].blob_key } : null;
}

/** Delete a document's row; returns its file key so the caller can remove the file */
export async function deleteDocument(id: string): Promise<string | null> {
  const rows = await sql`DELETE FROM documents WHERE id = ${id} RETURNING blob_key`;
  return rows[0]?.blob_key ?? null;
}

/** File keys of a booking's, deal's or talent's documents, to remove before deleting it */
export async function documentFileKeys(owner: { bookingId?: string; dealId?: string; talentId?: string }): Promise<string[]> {
  const rows = await sql`
    SELECT blob_key FROM documents
    WHERE booking_id = ${owner.bookingId ?? null}::uuid
       OR deal_id = ${owner.dealId ?? null}::uuid
       OR talent_id = ${owner.talentId ?? null}::uuid
  `;
  return rows.map((row: any) => row.blob_key);
}
