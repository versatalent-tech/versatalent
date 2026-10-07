import { NextRequest, NextResponse } from 'next/server';
import { getAllPointRules, createPointRule, updatePointRule } from '@/lib/db/repositories/vip-point-rules';
import type { VIPPointRuleRequest } from '@/lib/db/types';
import { requireAdmin } from '@/lib/middleware/auth';
import { clearTierSettingsCache } from '@/lib/services/vip-tiers';

/** Range check for settings stored as point rules; returns an error or null */
function invalidRuleValue(actionType: string, value: number): string | null {
  if (!Number.isFinite(value) || value < 0) return 'Value must be a number of 0 or more';
  if (actionType.startsWith('tier_discount_') && value > 100) return 'Discounts must be between 0% and 100%';
  if (actionType.startsWith('tier_multiplier_') && value < 1) return 'Multipliers must be at least 1';
  if (actionType.startsWith('tier_threshold_') && value <= 0) return 'Thresholds must be greater than 0';
  return null;
}

// GET all point rules
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const rules = await getAllPointRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching point rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch point rules' },
      { status: 500 }
    );
  }
}

// POST create or update point rule
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data: VIPPointRuleRequest = await request.json();

    // 0 is a valid value (e.g. a 0% Silver discount)
    if (!data.action_type || data.points_per_unit === undefined || data.points_per_unit === null || !data.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: action_type, points_per_unit, unit' },
        { status: 400 }
      );
    }

    const invalid = invalidRuleValue(data.action_type, Number(data.points_per_unit));
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const rule = await createPointRule(data);
    clearTierSettingsCache();

    return NextResponse.json(rule, { status: 201 });
  } catch (error: any) {
    console.error('Error creating point rule:', error);
    return NextResponse.json(
      { error: 'Failed to create point rule', details: error.message },
      { status: 500 }
    );
  }
}

// PUT update point rule
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data = await request.json();

    if (!data.action_type) {
      return NextResponse.json(
        { error: 'Missing required field: action_type' },
        { status: 400 }
      );
    }

    if (data.points_per_unit !== undefined) {
      const invalid = invalidRuleValue(data.action_type, Number(data.points_per_unit));
      if (invalid) {
        return NextResponse.json({ error: invalid }, { status: 400 });
      }
    }
    const rule = await updatePointRule(data.action_type, data);
    clearTierSettingsCache();

    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Error updating point rule:', error);
    return NextResponse.json(
      { error: 'Failed to update point rule', details: error.message },
      { status: 500 }
    );
  }
}
