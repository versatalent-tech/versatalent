import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Add detailed error logging
    console.log('[Auth Check] Starting authentication check...');

    const authenticated = await isAuthenticated();

    console.log('[Auth Check] Result:', authenticated);

    if (authenticated) {
      return NextResponse.json(
        { authenticated: true },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    // Log detailed error information
    console.error('[Auth Check] ERROR:', error);
    console.error('[Auth Check] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Auth Check] Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        authenticated: false,
        error: 'Authentication check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
