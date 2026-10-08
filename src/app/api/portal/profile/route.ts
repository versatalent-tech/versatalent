import { NextRequest } from 'next/server';
import { requireTalent } from '@/lib/auth/talent-auth';
import { parseBody } from '@/lib/crm/route-helpers';
import { profileChangeSchema } from '@/lib/portal/schemas';
import { getPortalProfile, submitProfileChange, withdrawProfileChange } from '@/lib/db/repositories/portal';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import type { ProfileFields } from '@/lib/portal/types';

export const dynamic = 'force-dynamic';

// GET /api/portal/profile - public profile fields and any pending change request
export async function GET() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  try {
    return successResponse(await getPortalProfile(auth.talent.talentId));
  } catch (error) {
    console.error('Portal profile error:', error);
    return ApiErrors.ServerError('Failed to load your profile');
  }
}

// POST /api/portal/profile - propose changes; an admin approves them before they go live
export async function POST(request: NextRequest) {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  const body = await parseBody(request, profileChangeSchema);
  if ('response' in body) return body.response;

  try {
    // Keep only fields that actually differ from the live profile
    const profile = await getPortalProfile(auth.talent.talentId);
    if (!profile) return ApiErrors.NotFound('Profile');
    const proposed = body.data.changes as Partial<ProfileFields>;
    const changes: Partial<ProfileFields> = {};
    for (const key of ['tagline', 'bio', 'location'] as const) {
      if (proposed[key] !== undefined && proposed[key] !== profile.current[key]) changes[key] = proposed[key];
    }
    if (proposed.skills && JSON.stringify(proposed.skills) !== JSON.stringify(profile.current.skills)) {
      changes.skills = proposed.skills;
    }
    if (proposed.social_links) {
      const links = Object.fromEntries(
        Object.entries(proposed.social_links).filter(
          ([k, v]) => (v ?? '') !== ((profile.current.social_links as Record<string, string>)[k] ?? '')
        )
      );
      if (Object.keys(links).length > 0) changes.social_links = links;
    }
    if (Object.keys(changes).length === 0) return ApiErrors.BadRequest('Nothing has changed');

    await submitProfileChange(auth.talent, changes, body.data.note ?? null);
    return successResponse(await getPortalProfile(auth.talent.talentId), 'Sent for approval', 201);
  } catch (error) {
    console.error('Portal profile submit error:', error);
    return ApiErrors.ServerError('Failed to send your changes');
  }
}

// DELETE /api/portal/profile - withdraw the pending request
export async function DELETE() {
  const auth = await requireTalent();
  if ('response' in auth) return auth.response;
  await withdrawProfileChange(auth.talent.talentId);
  return successResponse(await getPortalProfile(auth.talent.talentId));
}
