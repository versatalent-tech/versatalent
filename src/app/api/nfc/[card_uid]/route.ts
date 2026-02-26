import { NextRequest, NextResponse } from 'next/server';
import { getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ card_uid: string }> }
) {
  try {
    const { card_uid } = await params;

    // Get NFC card with user data
    const card = await getNFCCardByUID(card_uid);

    if (!card) {
      return NextResponse.json(
        { error: 'NFC card not found' },
        { status: 404 }
      );
    }

    if (!card.is_active) {
      return NextResponse.json(
        { error: 'This NFC card has been deactivated' },
        { status: 403 }
      );
    }

    // Return card data with user info (exclude sensitive data)
    const { user, ...cardData } = card;
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      talent_id: user.talent_id
    };

    return NextResponse.json({
      ...cardData,
      user: sanitizedUser
    });
  } catch (error) {
    console.error('Error fetching NFC card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFC card' },
      { status: 500 }
    );
  }
}
