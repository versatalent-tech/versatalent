import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/admin-auth';
import { clearAdminAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // Clear session cookie
    await clearSessionCookie();

    // Clear the admin_auth cookie
    await clearAdminAuth();

    return NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
