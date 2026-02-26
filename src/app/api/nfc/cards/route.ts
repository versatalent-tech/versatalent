import { NextRequest, NextResponse } from 'next/server';
import { getAllNFCCards, createNFCCard, getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';

// GET all NFC cards (with optional card_uid filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardUid = searchParams.get('card_uid');

    // If card_uid is provided, filter by it
    if (cardUid) {
      const card = await getNFCCardByUID(cardUid);
      if (card) {
        return NextResponse.json([card]);
      }
      return NextResponse.json([]);
    }

    // Otherwise return all cards
    const cards = await getAllNFCCards();
    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching NFC cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFC cards' },
      { status: 500 }
    );
  }
}

// POST create new NFC card
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields (user_id is now optional)
    if (!data.card_uid || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields: card_uid, type' },
        { status: 400 }
      );
    }

    // Validate type (added 'guest')
    const validTypes = ['artist', 'vip', 'staff', 'guest'];
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: artist, vip, staff, guest' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'blocked'];
    if (data.status && !validStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, inactive, blocked' },
        { status: 400 }
      );
    }

    // Check if card_uid already exists
    const existing = await getNFCCardByUID(data.card_uid);
    if (existing) {
      return NextResponse.json(
        { error: 'A card with this UID already exists' },
        { status: 409 }
      );
    }

    const card = await createNFCCard({
      card_uid: data.card_uid,
      user_id: data.user_id || null,
      type: data.type,
      status: data.status || 'active',
      metadata: data.metadata || {}
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error: any) {
    console.error('Error creating NFC card:', error);

    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'A card with this UID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create NFC card' },
      { status: 500 }
    );
  }
}
