import { sql } from '../client';
import type { NFCScanLog } from '../types';

export interface CreateScanLogRequest {
  card_uid: string;
  nfc_card_id?: string;
  user_id?: string;
  scan_type: 'read' | 'write' | 'error';
  reader_device?: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface ScanLogWithDetails extends NFCScanLog {
  user_name?: string;
  user_email?: string;
  card_type?: string;
}

/**
 * Create a new scan log entry
 */
export async function createScanLog(data: CreateScanLogRequest): Promise<NFCScanLog> {
  const logs = await sql<NFCScanLog[]>`
    INSERT INTO nfc_scan_logs (
      card_uid,
      nfc_card_id,
      user_id,
      scan_type,
      reader_device,
      success,
      error_message,
      metadata
    )
    VALUES (
      ${data.card_uid},
      ${data.nfc_card_id || null},
      ${data.user_id || null},
      ${data.scan_type},
      ${data.reader_device || null},
      ${data.success},
      ${data.error_message || null},
      ${JSON.stringify(data.metadata || {})}
    )
    RETURNING *
  `;
  return logs[0];
}

/**
 * Get recent scan logs with user and card details
 */
export async function getRecentScanLogs(limit = 50): Promise<ScanLogWithDetails[]> {
  const logs = await sql<ScanLogWithDetails[]>`
    SELECT
      nfc_scan_logs.*,
      users.name as user_name,
      users.email as user_email,
      nfc_cards.type as card_type
    FROM nfc_scan_logs
    LEFT JOIN users ON nfc_scan_logs.user_id = users.id
    LEFT JOIN nfc_cards ON nfc_scan_logs.nfc_card_id = nfc_cards.id
    ORDER BY nfc_scan_logs.created_at DESC
    LIMIT ${limit}
  `;
  return logs;
}

/**
 * Get scan logs for a specific card UID
 */
export async function getScanLogsByCardUID(cardUid: string, limit = 100): Promise<ScanLogWithDetails[]> {
  const logs = await sql<ScanLogWithDetails[]>`
    SELECT
      nfc_scan_logs.*,
      users.name as user_name,
      users.email as user_email,
      nfc_cards.type as card_type
    FROM nfc_scan_logs
    LEFT JOIN users ON nfc_scan_logs.user_id = users.id
    LEFT JOIN nfc_cards ON nfc_scan_logs.nfc_card_id = nfc_cards.id
    WHERE nfc_scan_logs.card_uid = ${cardUid}
    ORDER BY nfc_scan_logs.created_at DESC
    LIMIT ${limit}
  `;
  return logs;
}

/**
 * Get scan logs for a specific user
 */
export async function getScanLogsByUserId(userId: string, limit = 100): Promise<ScanLogWithDetails[]> {
  const logs = await sql<ScanLogWithDetails[]>`
    SELECT
      nfc_scan_logs.*,
      users.name as user_name,
      users.email as user_email,
      nfc_cards.type as card_type
    FROM nfc_scan_logs
    LEFT JOIN users ON nfc_scan_logs.user_id = users.id
    LEFT JOIN nfc_cards ON nfc_scan_logs.nfc_card_id = nfc_cards.id
    WHERE nfc_scan_logs.user_id = ${userId}
    ORDER BY nfc_scan_logs.created_at DESC
    LIMIT ${limit}
  `;
  return logs;
}

/**
 * Get scan statistics for a date range
 */
export async function getScanStatistics(startDate: Date, endDate: Date): Promise<{
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  unique_cards: number;
  unique_users: number;
}> {
  const stats = await sql<{
    total_scans: string;
    successful_scans: string;
    failed_scans: string;
    unique_cards: string;
    unique_users: string;
  }[]>`
    SELECT
      COUNT(*) as total_scans,
      COUNT(*) FILTER (WHERE success = true) as successful_scans,
      COUNT(*) FILTER (WHERE success = false) as failed_scans,
      COUNT(DISTINCT card_uid) as unique_cards,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
    FROM nfc_scan_logs
    WHERE created_at >= ${startDate}
      AND created_at <= ${endDate}
  `;

  const result = stats[0] || {
    total_scans: '0',
    successful_scans: '0',
    failed_scans: '0',
    unique_cards: '0',
    unique_users: '0'
  };

  return {
    total_scans: parseInt(result.total_scans, 10),
    successful_scans: parseInt(result.successful_scans, 10),
    failed_scans: parseInt(result.failed_scans, 10),
    unique_cards: parseInt(result.unique_cards, 10),
    unique_users: parseInt(result.unique_users, 10)
  };
}

/**
 * Delete old scan logs (for cleanup)
 */
export async function deleteOldScanLogs(daysToKeep = 90): Promise<number> {
  const result = await sql`
    DELETE FROM nfc_scan_logs
    WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
  `;
  return result.length;
}
