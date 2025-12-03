import { NextRequest, NextResponse } from 'next/server';
import {
  getTalentById,
  updateTalent,
  deleteTalent
} from '@/lib/db/repositories/talents';
import type { UpdateTalentRequest } from '@/lib/db/types';

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

// PUT - Update talent (admin only - add auth later)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      { error: 'Failed to update talent' },
      { status: 500 }
    );
  }
}

// DELETE talent (admin only - add auth later)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      { error: 'Failed to delete talent' },
      { status: 500 }
    );
  }
}
