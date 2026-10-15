import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/auth';
import { getTalentProfileStats, saveTalentProfileStats } from '@/lib/db/repositories/talent-stats';
import { MAX_EXTRA, PROFILE_STAT_KEYS, type ProfileStatKey, type ProfileStatSetting } from '@/lib/talents/profile-stats';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const setting = z.object({
  extra: z.number().int('Use whole numbers').min(0, 'Earlier work can’t be negative').max(MAX_EXTRA),
  hidden: z.boolean(),
});
const schema = z.object(Object.fromEntries(PROFILE_STAT_KEYS.map((key) => [key, setting])) as Record<ProfileStatKey, typeof setting>);

type Context = { params: Promise<{ id: string }> };

/** GET /api/talents/[id]/stats - counted figures, additions and visibility (admin) */
export const GET = withAdminAuth(async (_request: NextRequest, context?: Context) => {
  const { id } = await context!.params;
  const stats = isValidUUID(id) ? await getTalentProfileStats(id) : null;
  if (!stats) return NextResponse.json({ error: 'Talent not found' }, { status: 404 });
  return NextResponse.json({ stats });
});

/** PUT /api/talents/[id]/stats - save earlier work and visibility per figure (admin) */
export const PUT = withAdminAuth(async (request: NextRequest, context?: Context) => {
  const { id } = await context!.params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Talent not found' }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const saved = await saveTalentProfileStats(id, parsed.data as Record<ProfileStatKey, ProfileStatSetting>);
  if (!saved) return NextResponse.json({ error: 'Talent not found' }, { status: 404 });
  return NextResponse.json({ stats: await getTalentProfileStats(id) });
});
