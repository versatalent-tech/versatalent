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
    // If file doesn't exist, import from static data
    const { talents } = await import('@/lib/data/talents');
    await writeTalents(talents);
    return talents;
  }
}

// Helper to write talents to file
async function writeTalents(talents: Talent[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(talents, null, 2), 'utf-8');
}

// GET all talents
export async function GET(request: NextRequest) {
  try {
    const talents = await readTalents();

    // Optional: Filter by query params
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get('industry');
    const featured = searchParams.get('featured');

    let filteredTalents = talents;

    if (industry) {
      filteredTalents = filteredTalents.filter(t => t.industry === industry);
    }

    if (featured === 'true') {
      filteredTalents = filteredTalents.filter(t => t.featured);
    }

    return NextResponse.json(filteredTalents);
  } catch (error) {
    console.error('Error fetching talents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talents' },
      { status: 500 }
    );
  }
}

// POST - Create new talent
export async function POST(request: NextRequest) {
  try {
    const newTalent: Talent = await request.json();

    // Validate required fields
    if (!newTalent.name || !newTalent.industry) {
      return NextResponse.json(
        { error: 'Missing required fields: name, industry' },
        { status: 400 }
      );
    }

    const talents = await readTalents();

    // Generate new ID
    const maxId = talents.reduce((max, t) => {
      const id = parseInt(t.id);
      return id > max ? id : max;
    }, 0);

    newTalent.id = (maxId + 1).toString();

    // Set default values if not provided
    if (!newTalent.portfolio) newTalent.portfolio = [];
    if (!newTalent.featured) newTalent.featured = false;
    if (!newTalent.socialLinks) newTalent.socialLinks = {};

    talents.push(newTalent);
    await writeTalents(talents);

    return NextResponse.json(newTalent, { status: 201 });
  } catch (error) {
    console.error('Error creating talent:', error);
    return NextResponse.json(
      { error: 'Failed to create talent' },
      { status: 500 }
    );
  }
}
