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
      console.error('[API] Update talent failed: Invalid request context');
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { id } = await context.params;
    const data: UpdateTalentRequest = await request.json();

    console.log(`[API] Updating talent ${id} with fields:`, Object.keys(data));
    console.log('[API] Update data:', JSON.stringify(data, null, 2));

    const talent = await updateTalent(id, data);

    if (!talent) {
      console.error(`[API] Talent not found: ${id}`);
      return NextResponse.json(
        { error: 'Talent not found', talentId: id },
        { status: 404 }
      );
    }

    console.log(`[API] Successfully updated talent ${id}`);
    return NextResponse.json(talent);
  } catch (error) {
    console.error('[API] Error updating talent:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    });

    // Provide detailed error message based on error type
    let errorMessage = 'Failed to update talent';
    let errorDetails = 'Unknown error';

    if (error instanceof Error) {
      errorDetails = error.message;

      // Check for common database errors
      if (error.message.includes('syntax error')) {
        errorMessage = 'Database query syntax error';
      } else if (error.message.includes('invalid input')) {
        errorMessage = 'Invalid data format';
      } else if (error.message.includes('type') || error.message.includes('integer')) {
        errorMessage = 'Data type mismatch - check field values';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Database permission error';
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        hint: 'Check the server logs for more information'
      },
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
