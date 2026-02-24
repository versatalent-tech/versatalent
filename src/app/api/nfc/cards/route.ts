import { NextRequest, NextResponse } from 'next/server';
import { getAllNFCCards, createNFCCard, getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';

// GET all NFC cards
export async function GET(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!data.card_uid || !data.user_id || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields: card_uid, user_id, type' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['artist', 'vip', 'staff'];
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
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

    const card = await createNFCCard(data);
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
