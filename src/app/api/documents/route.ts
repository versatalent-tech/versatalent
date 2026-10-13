import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getTeamSession } from '@/lib/middleware/auth';
import { canUseOwner, documentFilter, isAdmin, ownerType, type DocumentOwner } from '@/lib/documents/access';
import {
  DOCUMENT_TYPES,
  KINDS_FOR,
  MAX_DOCUMENT_BYTES,
  SENSITIVE_KINDS,
  formatBytes,
  type DocumentKind,
} from '@/lib/documents/types';
import { createDocument, listBookingDocuments, listDealDocuments, listTalentDocuments } from '@/lib/db/repositories/documents';
import { getBookingScope } from '@/lib/db/repositories/bookings';
import { deleteDocumentFiles, saveDocumentFile } from '@/lib/services/document-storage';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function readOwner(get: (key: string) => unknown): DocumentOwner | null {
  for (const key of ['bookingId', 'dealId', 'talentId'] as const) {
    const value = get(key);
    if (typeof value === 'string' && isValidUUID(value)) return { [key]: value } as DocumentOwner;
  }
  return null;
}

function readDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' && DATE.test(value) ? value : undefined;
}

/**
 * GET /api/documents?bookingId= | ?dealId= | ?talentId=
 * The documents the person may see, and whether they may change them.
 */
export async function GET(request: NextRequest) {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');
  const owner = readOwner((key) => request.nextUrl.searchParams.get(key));
  if (!owner) return ApiErrors.BadRequest('Give a booking, deal or talent');

  try {
    if (!(await canUseOwner(session, owner, 'read'))) return ApiErrors.NotFound('Booking, deal or talent');
    const filter = documentFilter(session);
    const documents =
      'bookingId' in owner
        ? await listBookingDocuments(await getBookingScope(session), owner.bookingId, filter)
        : 'dealId' in owner
          ? await listDealDocuments(owner.dealId)
          : await listTalentDocuments(owner.talentId, filter);
    return successResponse({
      documents,
      can_edit: await canUseOwner(session, owner, 'write'),
      is_admin: isAdmin(session),
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return ApiErrors.ServerError('Failed to load documents');
  }
}

/**
 * POST /api/documents (multipart) - upload a document
 * Fields: file, kind, bookingId | dealId | talentId, and optionally
 * visible_to_talent ("true"), admin_only ("true", admins), expires_on and
 * delete_after (YYYY-MM-DD).
 */
export async function POST(request: NextRequest) {
  const session = await getTeamSession();
  if (!session) return ApiErrors.Unauthorized('Please sign in');

  const form = await request.formData().catch(() => null);
  if (!form) return ApiErrors.BadRequest('Upload a file');
  const owner = readOwner((key) => form.get(key));
  if (!owner) return ApiErrors.BadRequest('Give a booking, deal or talent');
  const type = ownerType(owner);

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return ApiErrors.BadRequest('Choose a file');
  if (file.size > MAX_DOCUMENT_BYTES) return ApiErrors.BadRequest(`Files can be up to ${formatBytes(MAX_DOCUMENT_BYTES)}`);
  const filename = file.name.replace(/[\\/\r\n"]/g, '_').trim().slice(0, 200) || 'document';
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = DOCUMENT_TYPES[extension];
  if (!contentType) return ApiErrors.BadRequest('Upload a PDF, Word or Excel file, CSV, text file or image');

  const kind = String(form.get('kind') ?? 'other') as DocumentKind;
  if (!KINDS_FOR[type].includes(kind)) return ApiErrors.BadRequest('Choose what kind of document this is');
  const sensitive = SENSITIVE_KINDS.includes(kind);
  if (sensitive && !isAdmin(session)) return ApiErrors.Forbidden('Only admins can add ID and right-to-work documents');

  const expiresOn = readDate(form.get('expires_on'));
  const deleteAfter = readDate(form.get('delete_after'));
  if (expiresOn === undefined || deleteAfter === undefined) return ApiErrors.BadRequest('Use valid dates');
  if (sensitive && !deleteAfter) return ApiErrors.BadRequest('Set a date to delete this ID document by');

  const visibleToTalent = type !== 'deal' && form.get('visible_to_talent') === 'true';
  const adminOnly = sensitive || (isAdmin(session) && form.get('admin_only') === 'true');

  try {
    if (!(await canUseOwner(session, owner, 'write'))) return ApiErrors.Forbidden("You can't add documents here");

    const id = randomUUID();
    const blobKey = `${id}-${randomUUID()}`;
    await saveDocumentFile(blobKey, await file.arrayBuffer());
    try {
      const document = await createDocument({
        id,
        booking_id: 'bookingId' in owner ? owner.bookingId : null,
        deal_id: 'dealId' in owner ? owner.dealId : null,
        talent_id: 'talentId' in owner ? owner.talentId : null,
        kind,
        filename,
        content_type: contentType,
        size_bytes: file.size,
        blob_key: blobKey,
        visible_to_talent: visibleToTalent,
        admin_only: adminOnly,
        expires_on: expiresOn,
        delete_after: deleteAfter,
        uploaded_by: session.userId ?? null,
        uploaded_by_name: session.name ?? null,
      });
      await logAudit({ userId: session.userId, name: session.name }, 'upload', 'document', id, {
        after: { filename, kind, ...owner, visible_to_talent: visibleToTalent, admin_only: adminOnly },
      });
      return successResponse(document, 'Uploaded', 201);
    } catch (error) {
      await deleteDocumentFiles([blobKey]);
      throw error;
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    return ApiErrors.ServerError('Failed to upload the document');
  }
}
