import { NextResponse } from 'next/server';
import { endTalentSession } from '@/lib/auth/talent-auth';

// POST /api/portal/auth/logout
export async function POST() {
  await endTalentSession();
  return NextResponse.json({ success: true });
}
