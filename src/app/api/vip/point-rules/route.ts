import { NextRequest, NextResponse } from 'next/server';
import { getAllPointRules, createPointRule, updatePointRule } from '@/lib/db/repositories/vip-point-rules';
import type { VIPPointRuleRequest } from '@/lib/db/types';

// GET all point rules
export async function GET(request: NextRequest) {
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
  try {
    const data: VIPPointRuleRequest = await request.json();

    if (!data.action_type || !data.points_per_unit || !data.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: action_type, points_per_unit, unit' },
        { status: 400 }
      );
    }

    const rule = await createPointRule(data);

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
  try {
    const data = await request.json();

    if (!data.action_type) {
      return NextResponse.json(
        { error: 'Missing required field: action_type' },
        { status: 400 }
      );
    }

    const rule = await updatePointRule(data.action_type, data);

    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Error updating point rule:', error);
    return NextResponse.json(
      { error: 'Failed to update point rule', details: error.message },
      { status: 500 }
    );
  }
}
