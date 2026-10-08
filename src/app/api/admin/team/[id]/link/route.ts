import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { createAuthLink, getTeamMember } from '@/lib/db/repositories/team';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';
import { setupLink } from '@/lib/utils/team';

/**
 * POST /api/admin/team/[id]/link - a new one-time link for this person to
 * set their password: an invite if they've never had one, otherwise a reset.
 * Earlier unused links stop working. The admin passes the link on themselves.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('team.manage');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Team member');

  try {
    const member = await getTeamMember(id);
    if (!member) return ApiErrors.NotFound('Team member');
    if (!member.is_active) return ApiErrors.BadRequest('Reactivate this account before sending a link');

    const purpose = member.has_password ? 'reset' : 'invite';
    const link = await createAuthLink(id, purpose, auth.session.userId);

    await logAudit({ userId: auth.session.userId, name: auth.session.name }, `${purpose}_link`, 'team_member', id);

    return successResponse({ link: setupLink(request, link.token), purpose, expiresAt: link.expiresAt.toISOString() });
  } catch (error) {
    console.error('Error creating account link:', error);
    return ApiErrors.ServerError('Failed to create link');
  }
}
