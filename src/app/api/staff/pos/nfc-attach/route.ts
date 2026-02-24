import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { withStaffAuth } from '@/lib/auth/staff-auth';
import type { NFCAttachResponse } from '@/lib/db/types';

/**
 * NFC Attach to POS Order API
 * POST /api/staff/pos/nfc-attach
 *
 * Automatically links an NFC card to a POS order when scanned
 */
export const POST = withStaffAuth(async (request: NextRequest, auth) => {
  try {
    const { card_uid, pos_order_id } = await request.json();

    // Validate input
    if (!card_uid || !pos_order_id) {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'Card UID and order ID are required'
        },
        { status: 400 }
      );
    }

    // Look up the NFC card
    const cards = await sql`
      SELECT id, user_id, type, is_active
      FROM nfc_cards
      WHERE card_uid = ${card_uid}
      LIMIT 1
    `;

    if (cards.length === 0) {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'NFC card not found. Please register this card first.'
        },
        { status: 404 }
      );
    }

    const card = cards[0];

    // Check if card is active
    if (!card.is_active) {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'This NFC card is inactive. Please contact support.'
        },
        { status: 403 }
      );
    }

    // Get the user associated with the card
    const users = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${card.user_id}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'User not found for this card'
        },
        { status: 404 }
      );
    }

    const user = users[0];

    // Get VIP membership if exists
    const vipMemberships = await sql`
      SELECT tier, points_balance, lifetime_points, status
      FROM vip_memberships
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    const vipMembership = vipMemberships.length > 0 ? vipMemberships[0] : null;

    // Check if VIP is active
    if (vipMembership && vipMembership.status !== 'active') {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'VIP membership is not active. Please contact support.'
        },
        { status: 403 }
      );
    }

    // Verify the order exists and is pending
    const orders = await sql`
      SELECT id, status, customer_user_id
      FROM pos_orders
      WHERE id = ${pos_order_id}
      LIMIT 1
    `;

    if (orders.length === 0) {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'Order not found'
        },
        { status: 404 }
      );
    }

    const order = orders[0];

    // Check if order is still pending
    if (order.status !== 'pending') {
      return NextResponse.json<NFCAttachResponse>(
        {
          success: false,
          error: 'Cannot attach customer to a non-pending order'
        },
        { status: 400 }
      );
    }

    // Attach the customer to the order
    await sql`
      UPDATE pos_orders
      SET customer_user_id = ${user.id}, updated_at = NOW()
      WHERE id = ${pos_order_id}
    `;

    // Return success with customer and VIP info
    const response: NFCAttachResponse = {
      success: true,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        vip: vipMembership ? {
          tier: vipMembership.tier,
          points_balance: vipMembership.points_balance,
          lifetime_points: vipMembership.lifetime_points,
        } : undefined,
      },
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('NFC attach error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to attach NFC card';
    return NextResponse.json<NFCAttachResponse>(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
});
