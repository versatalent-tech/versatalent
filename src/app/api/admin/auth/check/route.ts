import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();

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
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
