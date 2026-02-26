import { NextRequest, NextResponse } from 'next/server';
import {
  createScanLog,
  getRecentScanLogs,
  getScanLogsByCardUID,
  getScanLogsByUserId,
  getScanStatistics
} from '@/lib/db/repositories/nfc-scan-logs';

// GET scan logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardUid = searchParams.get('card_uid');
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const stats = searchParams.get('stats') === 'true';

    // Get statistics
    if (stats) {
      const startDate = new Date(searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const endDate = new Date(searchParams.get('end_date') || new Date());
      const statistics = await getScanStatistics(startDate, endDate);
      return NextResponse.json(statistics);
    }

    // Get logs by card UID
    if (cardUid) {
      const logs = await getScanLogsByCardUID(cardUid, limit);
      return NextResponse.json(logs);
    }

    // Get logs by user ID
    if (userId) {
      const logs = await getScanLogsByUserId(userId, limit);
      return NextResponse.json(logs);
    }

    // Get recent logs
    const logs = await getRecentScanLogs(limit);
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching scan logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan logs' },
      { status: 500 }
    );
  }
}

// POST create scan log
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.card_uid || !data.scan_type) {
      return NextResponse.json(
        { error: 'Missing required fields: card_uid, scan_type' },
        { status: 400 }
      );
    }

    // Validate scan_type
    const validScanTypes = ['read', 'write', 'error'];
    if (!validScanTypes.includes(data.scan_type)) {
      return NextResponse.json(
        { error: 'Invalid scan_type. Must be one of: read, write, error' },
        { status: 400 }
      );
    }

    const log = await createScanLog({
      card_uid: data.card_uid,
      nfc_card_id: data.nfc_card_id,
      user_id: data.user_id,
      scan_type: data.scan_type,
      reader_device: data.reader_device,
      success: data.success !== false, // Default to true
      error_message: data.error_message,
      metadata: data.metadata
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Error creating scan log:', error);
    return NextResponse.json(
      { error: 'Failed to create scan log' },
      { status: 500 }
    );
  }
}
