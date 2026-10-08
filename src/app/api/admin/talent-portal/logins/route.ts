import { NextRequest } from 'next/server';
import { requireTeamPermission } from '@/lib/middleware/auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { createTalentLoginSchema } from '@/lib/portal/schemas';
import { createArtistUser, listTalentLogins } from '@/lib/db/repositories/portal';
import { createAuthLink, emailExists } from '@/lib/db/repositories/team';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { sql } from '@/lib/db/client';
import { setupLink } from '@/lib/utils/team';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET /api/admin/talent-portal/logins - each talent and their portal login
export async function GET() {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await listTalentLogins());
  } catch (error) {
    console.error('Error listing talent logins:', error);
    return ApiErrors.ServerError('Failed to load talent logins');
  }
}

// POST /api/admin/talent-portal/logins - create a login for a talent who has none; returns an invite link
export async function POST(request: NextRequest) {
  const auth = await requireTeamPermission('portal.manage');
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, createTalentLoginSchema);
  if ('response' in body) return body.response;

  try {
    const talentRows = await sql`
      SELECT t.name, (SELECT COUNT(*) FROM users u WHERE u.talent_id = t.id AND u.role = 'artist') AS logins
      FROM talents t WHERE t.id = ${body.data.talent_id}
    `;
    const talent = talentRows[0];
    if (!talent) return ApiErrors.NotFound('Talent');
    if (Number(talent.logins) > 0) return ApiErrors.BadRequest('This talent already has a login');
    if (await emailExists(body.data.email!)) return ApiErrors.BadRequest('Someone already has an account with this email');

    const userId = await createArtistUser(body.data.talent_id!, talent.name, body.data.email!);
    const link = await createAuthLink(userId, 'invite', auth.session.userId);
    await logAudit({ userId: auth.session.userId, name: auth.session.name }, 'create', 'talent_login', userId, {
      after: { talent: talent.name, email: body.data.email },
    });
    return successResponse({ link: setupLink(request, link.token), expiresAt: link.expiresAt.toISOString() }, 'Login created', 201);
  } catch (error) {
    console.error('Error creating talent login:', error);
    return ApiErrors.ServerError('Failed to create login');
  }
}
