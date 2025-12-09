import { NextRequest, NextResponse } from 'next/server';
import { updateUser, getUserById } from '@/lib/db/repositories/users';
import { generateSecurePassword } from '@/lib/utils';

// POST - Reset user password (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { newPassword, generateRandom } = body;

    // Check if user exists
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate or use provided password
    const password = generateRandom ? generateSecurePassword(12) : newPassword;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Update user password
    await updateUser(id, { password });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      newPassword: generateRandom ? password : undefined, // Only return if auto-generated
    });

  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password', details: error.message },
      { status: 500 }
    );
  }
}
