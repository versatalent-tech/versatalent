import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import {
  MANAGEABLE_ROLES,
  getTeamMember,
  setTalentAssignments,
  updateTeamMember,
  type ManageableRole,
} from '@/lib/db/repositories/team';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';
import { ASSIGNABLE_ROLES, parseTalentIds } from '@/lib/utils/team';

// PATCH /api/admin/team/[id] - change name, role, active state or assigned talents
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamPermission('team.manage');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Team member');

  try {
    const before = await getTeamMember(id);
    if (!before) return ApiErrors.NotFound('Team member');

    const body = await request.json().catch(() => ({}));
    const changes: { name?: string; role?: ManageableRole; is_active?: boolean } = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 100) return ApiErrors.BadRequest('Enter a name (up to 100 characters)');
      changes.name = name;
    }
    if (body.role !== undefined) {
      if (!MANAGEABLE_ROLES.includes(body.role)) return ApiErrors.BadRequest('Choose a valid role');
      changes.role = body.role;
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') return ApiErrors.BadRequest('Invalid active value');
      changes.is_active = body.is_active;
    }
    const talentIds = body.talentIds === undefined ? undefined : parseTalentIds(body.talentIds);
    if (talentIds === null) return ApiErrors.BadRequest('Invalid talent selection');

    // Don't let an admin lock themselves out
    const isSelf = auth.session.userId === id;
    if (isSelf && ((changes.role && changes.role !== 'admin') || changes.is_active === false)) {
      return ApiErrors.BadRequest('You can’t remove your own admin access or deactivate yourself');
    }

    await updateTeamMember(id, changes);

    const finalRole = changes.role ?? before.role;
    if (!ASSIGNABLE_ROLES.includes(finalRole)) {
      // Admins see everyone and staff no one, so stored assignments would only mislead
      await setTalentAssignments(id, []);
    } else if (talentIds !== undefined) {
      await setTalentAssignments(id, talentIds);
    }

    const after = await getTeamMember(id);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'update', 'team_member', id, {
      before: { name: before.name, role: before.role, is_active: before.is_active, talents: before.talents.map((t) => t.name) },
      after: after && {
        name: after.name,
        role: after.role,
        is_active: after.is_active,
        talents: after.talents.map((t) => t.name),
      },
    });

    return successResponse(after, 'Team member updated');
  } catch (error) {
    console.error('Error updating team member:', error);
    return ApiErrors.ServerError('Failed to update team member');
  }
}
