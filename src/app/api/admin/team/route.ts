import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import {
  MANAGEABLE_ROLES,
  createAuthLink,
  createTeamMember,
  emailExists,
  getTeamMember,
  listTeamMembers,
  setTalentAssignments,
  type ManageableRole,
} from '@/lib/db/repositories/team';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidEmail } from '@/lib/utils/validation';
import { ASSIGNABLE_ROLES, parseTalentIds, setupLink } from '@/lib/utils/team';

export const dynamic = 'force-dynamic';

// GET /api/admin/team - everyone with a team or staff login
export async function GET() {
  const auth = await requireTeamPermission('team.manage');
  if ('response' in auth) return auth.response;

  try {
    return successResponse(await listTeamMembers());
  } catch (error) {
    console.error('Error listing team:', error);
    return ApiErrors.ServerError('Failed to load the team');
  }
}

// POST /api/admin/team - add a member; returns a one-time link for them to set a password
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('team.manage');
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body.role as ManageableRole;
    const talentIds = parseTalentIds(body.talentIds);

    if (!name || name.length > 100) return ApiErrors.BadRequest('Enter a name (up to 100 characters)');
    if (!isValidEmail(email)) return ApiErrors.BadRequest('Enter a valid email address');
    if (!MANAGEABLE_ROLES.includes(role)) return ApiErrors.BadRequest('Choose a valid role');
    if (talentIds === null) return ApiErrors.BadRequest('Invalid talent selection');
    if (await emailExists(email)) {
      return ApiErrors.BadRequest('Someone already has an account with this email');
    }

    const id = await createTeamMember({ name, email, role });
    if (ASSIGNABLE_ROLES.includes(role) && talentIds.length > 0) {
      await setTalentAssignments(id, talentIds);
    }
    const link = await createAuthLink(id, 'invite', auth.session.userId);
    const member = await getTeamMember(id);

    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'team_member', id, {
      after: { name, email, role, talents: member?.talents.map((t) => t.name) ?? [] },
    });

    return successResponse(
      { member, link: setupLink(request, link.token), expiresAt: link.expiresAt.toISOString() },
      'Team member added',
      201
    );
  } catch (error) {
    console.error('Error adding team member:', error);
    return ApiErrors.ServerError('Failed to add team member');
  }
}
