import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByEmail } from '@/lib/db/repositories/newsletter';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const unsubscribed = await unsubscribeByEmail(email);

    if (!unsubscribed) {
      return NextResponse.json(
        { message: 'Email not found or already unsubscribed' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
    });
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe. Please try again.' },
      { status: 500 }
    );
  }
}
