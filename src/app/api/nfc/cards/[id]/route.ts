import { NextRequest, NextResponse } from 'next/server';
import { getNFCCardById, updateNFCCard, deleteNFCCard } from '@/lib/db/repositories/nfc-cards';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = await getNFCCardById(id);

    if (!card) {
      return NextResponse.json(
        { error: 'NFC card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error('Error fetching NFC card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFC card' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const card = await updateNFCCard(id, data);
    return NextResponse.json(card);
  } catch (error: any) {
    console.error('Error updating NFC card:', error);

    if (error.message === 'No fields to update') {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update NFC card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteNFCCard(id);

    if (!success) {
      return NextResponse.json(
        { error: 'NFC card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'NFC card deleted successfully' });
  } catch (error) {
    console.error('Error deleting NFC card:', error);
    return NextResponse.json(
      { error: 'Failed to delete NFC card' },
      { status: 500 }
    );
  }
}
