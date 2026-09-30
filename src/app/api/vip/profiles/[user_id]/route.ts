import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getUserById } from '@/lib/db/repositories/users';
import { getVIPProfile, upsertVIPProfile } from '@/lib/db/repositories/vip-profiles';
import { parseVIPProfileInput } from '@/lib/vip-profile';

type RouteContext = { params: Promise<{ user_id: string }> };

// GET - VIP profile details (admin only)
export async function GET(request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { user_id } = await params;
    const profile = await getVIPProfile(user_id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching VIP profile:', error);
    return NextResponse.json({ error: 'Failed to fetch VIP profile' }, { status: 500 });
  }
}

// PUT - Create or update VIP profile details (admin only)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { user_id } = await params;

    const parsed = parseVIPProfileInput(await request.json());
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const user = await getUserById(user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = await upsertVIPProfile(user_id, parsed.profile);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error saving VIP profile:', error);
    return NextResponse.json({ error: 'Failed to save VIP profile' }, { status: 500 });
  }
}
