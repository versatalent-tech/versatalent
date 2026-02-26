import { sql } from '../client';
import type { CheckIn, CheckInWithDetails, CreateCheckInRequest } from '../types';

export async function getAllCheckIns(): Promise<CheckInWithDetails[]> {
  const checkins = await sql<any[]>`
    SELECT
      checkins.*,
      users.name as user_name,
      users.email as user_email,
      users.role as user_role,
      nfc_cards.card_uid,
      nfc_cards.type as card_type,
      nfc_events.name as event_name,
      nfc_events.date as event_date
    FROM checkins
    LEFT JOIN users ON checkins.user_id = users.id
    LEFT JOIN nfc_cards ON checkins.nfc_card_id = nfc_cards.id
    LEFT JOIN nfc_events ON checkins.event_id = nfc_events.id
    ORDER BY checkins.timestamp DESC
  `;

  return checkins.map(ci => ({
    id: ci.id,
    user_id: ci.user_id,
    nfc_card_id: ci.nfc_card_id,
    event_id: ci.event_id,
    source: ci.source,
    timestamp: ci.timestamp,
    metadata: ci.metadata,
    ip_address: ci.ip_address,
    user_agent: ci.user_agent,
    user: ci.user_name ? {
      id: ci.user_id,
      name: ci.user_name,
      email: ci.user_email,
      role: ci.user_role,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined,
    nfc_card: ci.card_uid ? {
      id: ci.nfc_card_id,
      card_uid: ci.card_uid,
      type: ci.card_type,
      user_id: ci.user_id,
      is_active: true,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    } : undefined,
    event: ci.event_name ? {
      id: ci.event_id,
      name: ci.event_name,
      date: ci.event_date,
      is_active: true,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}

export async function getCheckInById(id: string): Promise<CheckIn | null> {
  const checkins = await sql<CheckIn[]>`
    SELECT * FROM checkins WHERE id = ${id} LIMIT 1
  `;
  return checkins[0] || null;
}

export async function getCheckInsByUserId(userId: string, limit = 50): Promise<CheckInWithDetails[]> {
  const checkins = await sql<any[]>`
    SELECT
      checkins.*,
      users.name as user_name,
      users.email as user_email,
      nfc_events.name as event_name
    FROM checkins
    LEFT JOIN users ON checkins.user_id = users.id
    LEFT JOIN nfc_events ON checkins.event_id = nfc_events.id
    WHERE checkins.user_id = ${userId}
    ORDER BY checkins.timestamp DESC
    LIMIT ${limit}
  `;

  return checkins.map(ci => ({
    ...ci,
    user: ci.user_name ? {
      id: ci.user_id,
      name: ci.user_name,
      email: ci.user_email,
      role: 'artist' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined,
    event: ci.event_name ? {
      id: ci.event_id,
      name: ci.event_name,
      date: new Date(),
      is_active: true,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}

export async function getCheckInsByEventId(eventId: string): Promise<CheckInWithDetails[]> {
  const checkins = await sql<any[]>`
    SELECT
      checkins.*,
      users.name as user_name,
      users.email as user_email,
      users.role as user_role
    FROM checkins
    LEFT JOIN users ON checkins.user_id = users.id
    WHERE checkins.event_id = ${eventId}
    ORDER BY checkins.timestamp DESC
  `;

  return checkins.map(ci => ({
    ...ci,
    user: ci.user_name ? {
      id: ci.user_id,
      name: ci.user_name,
      email: ci.user_email,
      role: ci.user_role,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}

export async function getCheckInsBySource(source: string): Promise<CheckIn[]> {
  const checkins = await sql<CheckIn[]>`
    SELECT * FROM checkins
    WHERE source = ${source}
    ORDER BY timestamp DESC
  `;
  return checkins;
}

export async function getRecentCheckIns(limit = 100): Promise<CheckInWithDetails[]> {
  const checkins = await sql<any[]>`
    SELECT
      checkins.*,
      users.name as user_name,
      users.email as user_email,
      nfc_events.name as event_name
    FROM checkins
    LEFT JOIN users ON checkins.user_id = users.id
    LEFT JOIN nfc_events ON checkins.event_id = nfc_events.id
    ORDER BY checkins.timestamp DESC
    LIMIT ${limit}
  `;

  return checkins.map(ci => ({
    ...ci,
    user: ci.user_name ? {
      id: ci.user_id,
      name: ci.user_name,
      email: ci.user_email,
      role: 'artist' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined,
    event: ci.event_name ? {
      id: ci.event_id,
      name: ci.event_name,
      date: new Date(),
      is_active: true,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}

export async function createCheckIn(data: CreateCheckInRequest): Promise<CheckIn> {
  const checkins = await sql<CheckIn[]>`
    INSERT INTO checkins (
      user_id,
      nfc_card_id,
      event_id,
      source,
      metadata,
      ip_address,
      user_agent
    )
    VALUES (
      ${data.user_id},
      ${data.nfc_card_id || null},
      ${data.event_id || null},
      ${data.source},
      ${JSON.stringify(data.metadata || {})},
      ${data.ip_address || null},
      ${data.user_agent || null}
    )
    RETURNING *
  `;
  return checkins[0];
}

export async function getCheckInStats() {
  const stats = await sql`
    SELECT
      COUNT(*) as total_checkins,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT event_id) as events_with_checkins,
      source,
      COUNT(*) as count_by_source
    FROM checkins
    GROUP BY source
  `;

  return stats;
}

export async function getCheckInsByDateRange(startDate: Date, endDate: Date): Promise<CheckInWithDetails[]> {
  const checkins = await sql<any[]>`
    SELECT
      checkins.*,
      users.name as user_name,
      users.email as user_email
    FROM checkins
    LEFT JOIN users ON checkins.user_id = users.id
    WHERE checkins.timestamp >= ${startDate} AND checkins.timestamp <= ${endDate}
    ORDER BY checkins.timestamp DESC
  `;

  return checkins.map(ci => ({
    ...ci,
    user: ci.user_name ? {
      id: ci.user_id,
      name: ci.user_name,
      email: ci.user_email,
      role: 'artist' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}
