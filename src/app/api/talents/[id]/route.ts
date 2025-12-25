import { NextRequest, NextResponse } from 'next/server';
import {
  getTalentById,
  updateTalent,
  deleteTalent
} from '@/lib/db/repositories/talents';
import type { UpdateTalentRequest } from '@/lib/db/types';
import { withAdminAuth } from '@/lib/middleware/auth';

// GET single talent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const talent = await getTalentById(id);

    if (!talent) {
      return NextResponse.json(
        { error: 'Talent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(talent);
  } catch (error) {
    console.error('Error fetching talent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talent' },
      { status: 500 }
    );
  }
}

// PUT - Update talent (admin only)
export const PUT = withAdminAuth(async (
  request: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { id } = await context.params;
    const data: UpdateTalentRequest = await request.json();

    const talent = await updateTalent(id, data);

    if (!talent) {
      return NextResponse.json(
        { error: 'Talent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(talent);
  } catch (error) {
    console.error('Error updating talent:', error);
    return NextResponse.json(
      { error: 'Failed to update talent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// DELETE talent (admin only)
export const DELETE = withAdminAuth(async (
  request: Request,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { id } = await context.params;
    const success = await deleteTalent(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Talent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Talent deleted successfully' });
  } catch (error) {
    console.error('Error deleting talent:', error);
    return NextResponse.json(
      { error: 'Failed to delete talent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
