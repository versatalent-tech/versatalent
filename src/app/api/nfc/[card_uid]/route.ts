import { NextRequest, NextResponse } from 'next/server';
import { getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';

/**
 * GET /api/nfc/[card_uid] - public: what a phone tapping this card should open.
 *
 * Returns only what that page needs, by card type:
 *   artist: the talent's public profile id (never the user account id, which
 *           would unlock member data)
 *   vip:    the member's pass id (it's their own card)
 *   staff / guest: just the type
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ card_uid: string }> }
) {
  try {
    const { card_uid } = await params;
    const card = await getNFCCardByUID(card_uid);

    if (!card || !card.user?.id) {
      return NextResponse.json({ error: 'NFC card not found' }, { status: 404 });
    }
    if (!card.is_active || card.status === 'blocked') {
      return NextResponse.json({ error: 'This NFC card has been deactivated' }, { status: 403 });
    }

    switch (card.type) {
      case 'artist':
        if (!card.user.talent_id) {
          return NextResponse.json({ error: "This card isn't linked to a talent profile yet" }, { status: 404 });
        }
        return NextResponse.json({ type: 'artist', talent_id: card.user.talent_id });
      case 'vip':
        return NextResponse.json({ type: 'vip', member_id: card.user.id, name: card.user.name });
      default:
        return NextResponse.json({ type: card.type });
    }
  } catch (error) {
    console.error('Error fetching NFC card:', error);
    return NextResponse.json({ error: 'Failed to fetch NFC card' }, { status: 500 });
  }
}
