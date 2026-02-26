import { sql } from '../client';
import type { VIPPointRule, VIPPointRuleRequest } from '../types';

export async function getAllPointRules(): Promise<VIPPointRule[]> {
  const rules = await sql<any[]>`
    SELECT * FROM vip_point_rules
    ORDER BY action_type
  `;

  return rules.map(rule => ({
    ...rule,
    points_per_unit: parseFloat(rule.points_per_unit)
  }));
}

export async function getActivePointRules(): Promise<VIPPointRule[]> {
  const rules = await sql<any[]>`
    SELECT * FROM vip_point_rules
    WHERE is_active = TRUE
    ORDER BY action_type
  `;

  return rules.map(rule => ({
    ...rule,
    points_per_unit: parseFloat(rule.points_per_unit)
  }));
}

export async function getPointRuleByActionType(actionType: string): Promise<VIPPointRule | null> {
  const rules = await sql<any[]>`
    SELECT * FROM vip_point_rules
    WHERE action_type = ${actionType} AND is_active = TRUE
    LIMIT 1
  `;

  if (rules.length === 0) return null;

  return {
    ...rules[0],
    points_per_unit: parseFloat(rules[0].points_per_unit)
  };
}

export async function createPointRule(data: VIPPointRuleRequest): Promise<VIPPointRule> {
  const rules = await sql<any[]>`
    INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active)
    VALUES (
      ${data.action_type},
      ${data.points_per_unit},
      ${data.unit},
      ${data.is_active !== undefined ? data.is_active : true}
    )
    ON CONFLICT (action_type) DO UPDATE
    SET
      points_per_unit = ${data.points_per_unit},
      unit = ${data.unit},
      is_active = ${data.is_active !== undefined ? data.is_active : true}
    RETURNING *
  `;

  return {
    ...rules[0],
    points_per_unit: parseFloat(rules[0].points_per_unit)
  };
}

export async function updatePointRule(
  actionType: string,
  data: Partial<VIPPointRuleRequest>
): Promise<VIPPointRule> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.points_per_unit !== undefined) {
    updates.push(`points_per_unit = $${paramIndex++}`);
    values.push(data.points_per_unit);
  }
  if (data.unit !== undefined) {
    updates.push(`unit = $${paramIndex++}`);
    values.push(data.unit);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(actionType);
  const query = `
    UPDATE vip_point_rules
    SET ${updates.join(', ')}
    WHERE action_type = $${paramIndex}
    RETURNING *
  `;

  const rules = await sql<any[]>(query, values);

  return {
    ...rules[0],
    points_per_unit: parseFloat(rules[0].points_per_unit)
  };
}

export async function togglePointRule(actionType: string): Promise<VIPPointRule> {
  const rules = await sql<any[]>`
    UPDATE vip_point_rules
    SET is_active = NOT is_active
    WHERE action_type = ${actionType}
    RETURNING *
  `;

  return {
    ...rules[0],
    points_per_unit: parseFloat(rules[0].points_per_unit)
  };
}

export async function deletePointRule(actionType: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM vip_point_rules WHERE action_type = ${actionType}
  `;
  return result.length > 0;
}
