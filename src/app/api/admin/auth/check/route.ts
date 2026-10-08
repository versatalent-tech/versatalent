import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/middleware/auth';

// GET /api/admin/auth/check - is a team member (admin, manager, road manager) signed in?
export async function GET() {
  try {
    const session = await getTeamSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: session.userId ?? null, name: session.name ?? null, role: session.role },
    });
  } catch (error) {
    console.error('[Auth Check] Error:', error);
    return NextResponse.json({ authenticated: false, error: 'Authentication check failed' }, { status: 500 });
  }
}
