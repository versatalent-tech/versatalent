/**
 * Who may read and change documents. Every documents route goes through
 * these checks; the files themselves are never public.
 *
 * Read:
 *   admin: everything
 *   manager: bookings and profiles of their assigned talents; deals they can
 *            see; never admin-only documents
 *   road manager: riders and briefs of their assigned talents
 *   talent: their own bookings' and profile's documents switched to visible
 * Change (upload, edit, delete): admins, and managers within the same
 *   scope (bookings.edit for bookings and profiles, crm.edit for deals).
 *   Only admins handle admin-only documents (ID / right to work).
 */
import { can, type Permission } from '@/lib/auth/permissions';
import { getTeamSession, type TeamSession } from '@/lib/middleware/auth';
import { getTalentSession } from '@/lib/auth/talent-auth';
import { canSeeTalent, getBooking, getBookingScope } from '@/lib/db/repositories/bookings';
import { getCrmScope, getDeal } from '@/lib/db/repositories/crm';
import type { DocumentFilter, DocumentRow } from '@/lib/db/repositories/documents';
import { ROAD_MANAGER_KINDS, type DocumentOwnerType } from './types';

export type DocumentOwner = { bookingId: string } | { dealId: string } | { talentId: string };

export function ownerType(owner: DocumentOwner): DocumentOwnerType {
  return 'bookingId' in owner ? 'booking' : 'dealId' in owner ? 'deal' : 'talent';
}

export function isAdmin(session: TeamSession): boolean {
  return session.role === 'admin';
}

/** What this team member may list */
export function documentFilter(session: TeamSession): DocumentFilter {
  return {
    kinds: session.role === 'road_manager' ? ROAD_MANAGER_KINDS : null,
    includeAdminOnly: isAdmin(session),
  };
}

/**
 * Can this team member open the booking, deal or talent at all, for reading
 * or for changing its documents?
 */
export async function canUseOwner(session: TeamSession, owner: DocumentOwner, mode: 'read' | 'write'): Promise<boolean> {
  if ('dealId' in owner) {
    const permission: Permission = mode === 'read' ? 'crm.view' : 'crm.edit';
    if (!can(session.role, permission)) return false;
    return Boolean(await getDeal(await getCrmScope(session), owner.dealId));
  }

  const permission: Permission = mode === 'read' ? 'bookings.view' : 'bookings.edit';
  if (!can(session.role, permission)) return false;
  const scope = await getBookingScope(session);
  if ('bookingId' in owner) return Boolean(await getBooking(scope, false, owner.bookingId));
  return canSeeTalent(scope, owner.talentId);
}

/** May the person making this request download the document? */
export async function canReadDocument(doc: DocumentRow): Promise<boolean> {
  const team = await getTeamSession();
  if (team) {
    if (doc.admin_only && !isAdmin(team)) return false;
    if (doc.deal_id) return canUseOwner(team, { dealId: doc.deal_id }, 'read');
    if (!can(team.role, 'bookings.view') || !doc.owner_talent_id) return false;
    if (!canSeeTalent(await getBookingScope(team), doc.owner_talent_id)) return false;
    const { kinds } = documentFilter(team);
    return !kinds || kinds.includes(doc.kind);
  }

  const talent = await getTalentSession();
  return Boolean(talent && !doc.deal_id && doc.visible_to_talent && doc.owner_talent_id === talent.talentId);
}

/** May this team member change (edit, delete) the document? */
export async function canChangeDocument(session: TeamSession, doc: DocumentRow): Promise<boolean> {
  if (doc.admin_only && !isAdmin(session)) return false;
  const owner: DocumentOwner | null = doc.booking_id
    ? { bookingId: doc.booking_id }
    : doc.deal_id
      ? { dealId: doc.deal_id }
      : doc.talent_id
        ? { talentId: doc.talent_id }
        : null;
  return owner !== null && (await canUseOwner(session, owner, 'write'));
}
