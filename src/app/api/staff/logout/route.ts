import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearStaffAuth } from '@/lib/middleware/auth';

/**
 * Staff Logout API
 * POST /api/staff/logout
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('staff_session');

    // Clear the staff_auth cookie
    await clearStaffAuth();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
