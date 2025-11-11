import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Talent } from '@/lib/data/talents';

const DATA_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'talents-data.json');

// Helper to read talents from file
async function readTalents(): Promise<Talent[]> {
  try {
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    const { talents } = await import('@/lib/data/talents');
    await writeTalents(talents);
    return talents;
  }
}

// Helper to write talents to file
async function writeTalents(talents: Talent[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(talents, null, 2), 'utf-8');
}

// GET single talent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const talents = await readTalents();
    const talent = talents.find(t => t.id === id);

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

// PUT - Update talent
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updatedTalent: Talent = await request.json();
    const talents = await readTalents();

    const index = talents.findIndex(t => t.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Talent not found' },
        { status: 404 }
      );
    }

    // Preserve the ID
    updatedTalent.id = id;
    talents[index] = updatedTalent;

    await writeTalents(talents);

    return NextResponse.json(updatedTalent);
  } catch (error) {
    console.error('Error updating talent:', error);
    return NextResponse.json(
      { error: 'Failed to update talent' },
      { status: 500 }
    );
  }
}

// DELETE talent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const talents = await readTalents();
    const filteredTalents = talents.filter(t => t.id !== id);

    if (talents.length === filteredTalents.length) {
      return NextResponse.json(
        { error: 'Talent not found' },
        { status: 404 }
      );
    }

    await writeTalents(filteredTalents);

    return NextResponse.json({ success: true, message: 'Talent deleted successfully' });
  } catch (error) {
    console.error('Error deleting talent:', error);
    return NextResponse.json(
      { error: 'Failed to delete talent' },
      { status: 500 }
    );
  }
}
