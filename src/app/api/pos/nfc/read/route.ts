import { NextRequest, NextResponse } from 'next/server';
import { getNFCCardByUID } from '@/lib/db/repositories/nfc-cards';
import { getUserById } from '@/lib/db/repositories/users';
import { getVIPMembershipByUserId } from '@/lib/db/repositories/vip-memberships';
import { withPOSAuth } from '@/lib/auth/pos-auth';

/**
 * Read NFC card and return customer info for POS
 * POST /api/pos/nfc/read
 */
export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const { card_uid } = await request.json();

    if (!card_uid) {
      return NextResponse.json(
        { error: 'card_uid is required' },
        { status: 400 }
      );
    }

    // Look up NFC card
    const nfcCard = await getNFCCardByUID(card_uid);

    if (!nfcCard) {
      return NextResponse.json(
        { error: 'NFC card not found. Please register this card first.' },
        { status: 404 }
      );
    }

    if (!nfcCard.is_active) {
      return NextResponse.json(
        { error: 'This NFC card is inactive. Please contact admin.' },
        { status: 403 }
      );
    }

    // Get user details
    const user = await getUserById(nfcCard.user_id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this NFC card.' },
        { status: 404 }
      );
    }

    // Get VIP membership if exists
    let vipMembership = null;
    if (user.role === 'vip') {
      vipMembership = await getVIPMembershipByUserId(user.id);
    }

    // Return customer info for POS
    return NextResponse.json({
      success: true,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        nfc_card_id: nfcCard.id,
        nfc_card_type: nfcCard.type,
      },
      vip: vipMembership ? {
        tier: vipMembership.tier,
        points_balance: vipMembership.points_balance,
        lifetime_points: vipMembership.lifetime_points,
        status: vipMembership.status
      } : null
    });

  } catch (error: any) {
    console.error('Error reading NFC card:', error);
    return NextResponse.json(
      { error: 'Failed to read NFC card', details: error.message },
      { status: 500 }
    );
  }
});
