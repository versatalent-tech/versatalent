import { NextRequest, NextResponse } from 'next/server';
import {
  isAdminLoginConfigured,
  verifyAdminCredentials,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth/admin-auth';

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

    if (!isAdminLoginConfigured()) {
      console.error('Admin login attempted but ADMIN_USERNAME / ADMIN_PASSWORD are not set');
      return NextResponse.json(
        { error: 'Admin login is not configured' },
        { status: 503 }
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
    const token = await createSessionToken(username);

    // Set session cookie
    await setSessionCookie(token);

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
