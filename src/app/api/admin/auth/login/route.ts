import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth/admin-auth';
import { setAdminAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify credentials
    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken();

    // Set session cookie
    await setSessionCookie(token);

    // ALSO set the admin_auth cookie that the middleware expects
    await setAdminAuth();

    return NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
