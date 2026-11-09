import { NextResponse } from 'next/server';
import { clearStaffAuth } from '@/lib/middleware/auth';

/**
 * Staff Logout API
 * POST /api/staff/logout
 */
export async function POST() {
  try {
    // Clear session cookie (and any legacy auth cookies)
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
