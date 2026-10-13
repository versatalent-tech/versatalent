import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTeamSession } from '@/lib/middleware/auth';
import { canChangeDocument, canReadDocument, isAdmin } from '@/lib/documents/access';
import { DOCUMENT_KIND_KEYS, KINDS_FOR, SENSITIVE_KINDS } from '@/lib/documents/types';
import { deleteDocument, getDocumentRow, updateDocument } from '@/lib/db/repositories/documents';
import { deleteDocumentFiles, readDocumentFile } from '@/lib/services/document-storage';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { parseBody } from '@/lib/crm/route-helpers';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').nullable().optional();

const updateSchema = z.object({
  kind: z.enum(DOCUMENT_KIND_KEYS).optional(),
  visible_to_talent: z.boolean().optional(),
  admin_only: z.boolean().optional(),
  is_public: z.boolean().optional(),
  expires_on: date,
  delete_after: date,
});

/**
 * GET /api/documents/[id] - download, for team members and talents allowed
 * to see it (lib/documents/access). Always a download, never shown inline,
 * and never cached.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const notFound = () => new NextResponse('Not found', { status: 404 });
  if (!isValidUUID(id)) return notFound();

  try {
    const doc = await getDocumentRow(id);
    // Same answer whether it doesn't exist or isn't theirs
    if (!doc || !(await canReadDocument(doc))) return notFound();
    const data = await readDocumentFile(doc.blob_key);
    if (!data) return notFound();

    const asciiName = doc.filename.replace(/[^\x20-\x7e]/g, '_');
    return new NextResponse(data, {
      headers: {
        'Content-Type': doc.content_type,
        'Content-Length': String(data.byteLength),
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return new NextResponse('Download failed', { status: 500 });
  }
}

// PATCH /api/documents/[id] { kind?, visible_to_talent? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Document');
  const body = await parseBody(request, updateSchema);
  if ('response' in body) return body.response;

  try {
    const doc = await getDocumentRow(id);
    if (!doc || !(await canChangeDocument(session, doc))) return ApiErrors.NotFound('Document');

    const changes = body.data;
    const type = doc.booking_id ? 'booking' : doc.deal_id ? 'deal' : 'talent';
    const kind = changes.kind ?? doc.kind;
    if (!KINDS_FOR[type].includes(kind)) return ApiErrors.BadRequest('That kind of document doesn’t belong here');
    if (!isAdmin(session) && (changes.admin_only !== undefined || SENSITIVE_KINDS.includes(kind))) {
      return ApiErrors.Forbidden('Only admins can change who sees this');
    }
    const deleteAfter = Object.prototype.hasOwnProperty.call(changes, 'delete_after') ? changes.delete_after : doc.delete_after;
    if (SENSITIVE_KINDS.includes(kind) && !deleteAfter) return ApiErrors.BadRequest('Set a date to delete this ID document by');

    const updated = await updateDocument(doc, changes);
    await logAudit({ userId: session.userId, name: session.name }, 'update', 'document', id, {
      before: { kind: doc.kind, visible_to_talent: doc.visible_to_talent, admin_only: doc.admin_only, is_public: doc.is_public, expires_on: doc.expires_on, delete_after: doc.delete_after },
      after: updated && {
        kind: updated.kind,
        visible_to_talent: updated.visible_to_talent,
        admin_only: updated.admin_only,
        is_public: updated.is_public,
        expires_on: updated.expires_on,
        delete_after: updated.delete_after,
      },
    });
    return successResponse(updated, 'Saved');
  } catch (error) {
    console.error('Error updating document:', error);
    return ApiErrors.ServerError('Failed to save');
  }
}

// DELETE /api/documents/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Document');

  try {
    const doc = await getDocumentRow(id);
    if (!doc || !(await canChangeDocument(session, doc))) return ApiErrors.NotFound('Document');
    const key = await deleteDocument(id);
    if (key) await deleteDocumentFiles([key]);
    await logAudit({ userId: session.userId, name: session.name }, 'delete', 'document', id, {
      before: { filename: doc.filename, kind: doc.kind, booking_id: doc.booking_id, deal_id: doc.deal_id, talent_id: doc.talent_id },
    });
    return successResponse(null, 'Deleted');
  } catch (error) {
    console.error('Error deleting document:', error);
    return ApiErrors.ServerError('Failed to delete');
  }
}
