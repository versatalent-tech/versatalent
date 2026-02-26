import { sql } from '../client';
import type { VIPTierBenefit, CreateTierBenefitRequest, UpdateTierBenefitRequest, VIPTier } from '../types';

/**
 * Get all tier benefits
 */
export async function getAllTierBenefits(): Promise<VIPTierBenefit[]> {
  const benefits = await sql<VIPTierBenefit[]>`
    SELECT * FROM vip_tier_benefits
    ORDER BY
      CASE tier_name
        WHEN 'silver' THEN 1
        WHEN 'gold' THEN 2
        WHEN 'black' THEN 3
      END,
      created_at ASC
  `;
  return benefits;
}

/**
 * Get active tier benefits only
 */
export async function getActiveTierBenefits(): Promise<VIPTierBenefit[]> {
  const benefits = await sql<VIPTierBenefit[]>`
    SELECT * FROM vip_tier_benefits
    WHERE is_active = TRUE
    ORDER BY
      CASE tier_name
        WHEN 'silver' THEN 1
        WHEN 'gold' THEN 2
        WHEN 'black' THEN 3
      END,
      created_at ASC
  `;
  return benefits;
}

/**
 * Get benefits by tier name
 */
export async function getBenefitsByTier(tierName: VIPTier, activeOnly = true): Promise<VIPTierBenefit[]> {
  if (activeOnly) {
    const benefits = await sql<VIPTierBenefit[]>`
      SELECT * FROM vip_tier_benefits
      WHERE tier_name = ${tierName} AND is_active = TRUE
      ORDER BY created_at ASC
    `;
    return benefits;
  } else {
    const benefits = await sql<VIPTierBenefit[]>`
      SELECT * FROM vip_tier_benefits
      WHERE tier_name = ${tierName}
      ORDER BY created_at ASC
    `;
    return benefits;
  }
}

/**
 * Get benefit by ID
 */
export async function getTierBenefitById(id: string): Promise<VIPTierBenefit | null> {
  const benefits = await sql<VIPTierBenefit[]>`
    SELECT * FROM vip_tier_benefits
    WHERE id = ${id}
    LIMIT 1
  `;
  return benefits[0] || null;
}

/**
 * Create a new tier benefit
 */
export async function createTierBenefit(data: CreateTierBenefitRequest): Promise<VIPTierBenefit> {
  const benefits = await sql<VIPTierBenefit[]>`
    INSERT INTO vip_tier_benefits (tier_name, title, description, is_active)
    VALUES (
      ${data.tier_name},
      ${data.title},
      ${data.description || null},
      ${data.is_active !== undefined ? data.is_active : true}
    )
    RETURNING *
  `;
  return benefits[0];
}

/**
 * Update a tier benefit
 */
export async function updateTierBenefit(
  id: string,
  data: UpdateTierBenefitRequest
): Promise<VIPTierBenefit> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(id);
  const query = `
    UPDATE vip_tier_benefits
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const benefits = await sql<VIPTierBenefit[]>(query, values);

  if (benefits.length === 0) {
    throw new Error('Tier benefit not found');
  }

  return benefits[0];
}

/**
 * Toggle benefit active status
 */
export async function toggleTierBenefit(id: string): Promise<VIPTierBenefit> {
  const benefits = await sql<VIPTierBenefit[]>`
    UPDATE vip_tier_benefits
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

  if (benefits.length === 0) {
    throw new Error('Tier benefit not found');
  }

  return benefits[0];
}

/**
 * Delete a tier benefit
 */
export async function deleteTierBenefit(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM vip_tier_benefits WHERE id = ${id}
  `;
  return result.count > 0;
}

/**
 * Get benefits count by tier
 */
export async function getBenefitsCountByTier(): Promise<Record<VIPTier, number>> {
  const counts = await sql<{ tier_name: VIPTier; count: string }[]>`
    SELECT tier_name, COUNT(*) as count
    FROM vip_tier_benefits
    WHERE is_active = TRUE
    GROUP BY tier_name
  `;

  const result: Record<VIPTier, number> = {
    silver: 0,
    gold: 0,
    black: 0
  };

  counts.forEach(row => {
    result[row.tier_name] = parseInt(row.count);
  });

  return result;
}
