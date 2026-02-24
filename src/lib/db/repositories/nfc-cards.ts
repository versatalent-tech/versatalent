import { sql } from '../client';
import type { NFCCard, NFCCardWithUser, CreateNFCCardRequest, UpdateNFCCardRequest, User } from '../types';
import { getVIPMembershipByUserId } from './vip-memberships';
import { getBenefitsByTier } from './vip-tier-benefits';

/**
 * Generate metadata for NFC card based on user's VIP tier
 */
export async function generateNFCCardMetadata(userId: string): Promise<Record<string, any>> {
  try {
    // Get user's VIP membership
    const membership = await getVIPMembershipByUserId(userId);

    if (!membership) {
      // Default metadata if no VIP membership exists
      return {
        membership_tier: 'none',
        benefits: []
      };
    }

    // Get benefits for the user's tier
    const tierBenefits = await getBenefitsByTier(membership.tier, true);
    const benefits = tierBenefits.map(benefit => benefit.title);

    return {
      membership_tier: membership.tier,
      benefits: benefits
    };
  } catch (error) {
    console.error('Error generating NFC card metadata:', error);
    return {
      membership_tier: 'none',
      benefits: []
    };
  }
}

export async function getAllNFCCards(): Promise<NFCCardWithUser[]> {
  const cards = await sql<(NFCCard & { user_name: string; user_email: string; user_role: string })[]>`
    SELECT
      nfc_cards.*,
      users.name as user_name,
      users.email as user_email,
      users.role as user_role
    FROM nfc_cards
    LEFT JOIN users ON nfc_cards.user_id = users.id
    ORDER BY nfc_cards.created_at DESC
  `;

  return cards.map(card => ({
    ...card,
    user: {
      id: card.user_id,
      name: card.user_name,
      email: card.user_email,
      role: card.user_role as any,
      created_at: new Date(),
      updated_at: new Date()
    }
  }));
}

export async function getNFCCardById(id: string): Promise<NFCCard | null> {
  const cards = await sql<NFCCard[]>`
    SELECT * FROM nfc_cards WHERE id = ${id} LIMIT 1
  `;
  return cards[0] || null;
}

export async function getNFCCardByUID(cardUid: string): Promise<NFCCardWithUser | null> {
  const cards = await sql<(NFCCard & {
    user_id: string;
    user_name: string;
    user_email: string;
    user_role: string;
    user_avatar_url?: string;
    user_talent_id?: string;
  })[]>`
    SELECT
      nfc_cards.*,
      users.id as user_id,
      users.name as user_name,
      users.email as user_email,
      users.role as user_role,
      users.avatar_url as user_avatar_url,
      users.talent_id as user_talent_id
    FROM nfc_cards
    LEFT JOIN users ON nfc_cards.user_id = users.id
    WHERE nfc_cards.card_uid = ${cardUid}
    LIMIT 1
  `;

  if (cards.length === 0) {
    return null;
  }

  const card = cards[0];
  return {
    ...card,
    user: {
      id: card.user_id,
      name: card.user_name,
      email: card.user_email,
      role: card.user_role as any,
      avatar_url: card.user_avatar_url,
      talent_id: card.user_talent_id,
      created_at: new Date(),
      updated_at: new Date()
    }
  };
}

export async function getNFCCardsByUserId(userId: string): Promise<NFCCard[]> {
  const cards = await sql<NFCCard[]>`
    SELECT * FROM nfc_cards WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return cards;
}

export async function createNFCCard(data: CreateNFCCardRequest): Promise<NFCCard> {
  // Automatically generate metadata based on user's VIP tier if not provided
  let metadata = data.metadata || {};

  if (!data.metadata || Object.keys(data.metadata).length === 0) {
    metadata = await generateNFCCardMetadata(data.user_id);
  }

  const cards = await sql<NFCCard[]>`
    INSERT INTO nfc_cards (card_uid, user_id, type, metadata)
    VALUES (
      ${data.card_uid},
      ${data.user_id},
      ${data.type},
      ${JSON.stringify(metadata)}
    )
    RETURNING *
  `;
  return cards[0];
}

export async function updateNFCCard(id: string, data: UpdateNFCCardRequest): Promise<NFCCard> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.card_uid !== undefined) {
    updates.push(`card_uid = $${paramIndex++}`);
    values.push(data.card_uid);
  }
  if (data.user_id !== undefined) {
    updates.push(`user_id = $${paramIndex++}`);
    values.push(data.user_id);
  }
  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const query = `
    UPDATE nfc_cards
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const cards = await sql<NFCCard[]>(query, values);
  return cards[0];
}

export async function deleteNFCCard(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM nfc_cards WHERE id = ${id}
  `;
  return result.length > 0;
}

export async function activateNFCCard(id: string): Promise<NFCCard> {
  return updateNFCCard(id, { is_active: true });
}

export async function deactivateNFCCard(id: string): Promise<NFCCard> {
  return updateNFCCard(id, { is_active: false });
}

/**
 * Update metadata for all NFC cards belonging to a user
 * Used when user's VIP tier changes
 */
export async function updateUserNFCCardsMetadata(userId: string): Promise<void> {
  try {
    // Generate new metadata based on current VIP tier
    const metadata = await generateNFCCardMetadata(userId);

    // Update all cards for this user
    await sql`
      UPDATE nfc_cards
      SET metadata = ${JSON.stringify(metadata)}
      WHERE user_id = ${userId}
    `;
  } catch (error) {
    console.error('Error updating user NFC cards metadata:', error);
    throw error;
  }
}
