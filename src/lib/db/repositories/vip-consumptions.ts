import { sql } from '../client';
import type { VIPConsumption, VIPConsumptionWithDetails, CreateVIPConsumptionRequest } from '../types';

export async function getAllVIPConsumptions(): Promise<VIPConsumptionWithDetails[]> {
  const consumptions = await sql<any[]>`
    SELECT
      vip_consumptions.*,
      users.name as user_name,
      users.email as user_email,
      nfc_events.name as event_name,
      nfc_events.date as event_date
    FROM vip_consumptions
    LEFT JOIN users ON vip_consumptions.user_id = users.id
    LEFT JOIN nfc_events ON vip_consumptions.event_id = nfc_events.id
    ORDER BY vip_consumptions.created_at DESC
  `;

  return consumptions.map(c => ({
    id: c.id,
    user_id: c.user_id,
    event_id: c.event_id,
    amount: parseFloat(c.amount),
    currency: c.currency,
    description: c.description,
    created_at: c.created_at,
    user: c.user_name ? {
      id: c.user_id,
      name: c.user_name,
      email: c.user_email,
      role: 'vip' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined,
    event: c.event_name ? {
      id: c.event_id,
      name: c.event_name,
      date: c.event_date,
      is_active: true,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}

export async function getVIPConsumptionsByUserId(
  userId: string,
  limit = 50
): Promise<VIPConsumption[]> {
  const consumptions = await sql<any[]>`
    SELECT * FROM vip_consumptions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return consumptions.map(c => ({
    ...c,
    amount: parseFloat(c.amount)
  }));
}

export async function getVIPConsumptionsByEventId(eventId: string): Promise<VIPConsumption[]> {
  const consumptions = await sql<any[]>`
    SELECT * FROM vip_consumptions
    WHERE event_id = ${eventId}
    ORDER BY created_at DESC
  `;

  return consumptions.map(c => ({
    ...c,
    amount: parseFloat(c.amount)
  }));
}

export async function createVIPConsumption(
  data: CreateVIPConsumptionRequest
): Promise<VIPConsumption> {
  const consumptions = await sql<any[]>`
    INSERT INTO vip_consumptions (
      user_id,
      event_id,
      amount,
      currency,
      description
    )
    VALUES (
      ${data.user_id},
      ${data.event_id || null},
      ${data.amount},
      ${data.currency || 'EUR'},
      ${data.description || null}
    )
    RETURNING *
  `;

  return {
    ...consumptions[0],
    amount: parseFloat(consumptions[0].amount)
  };
}

export async function getTotalConsumptionByUserId(userId: string): Promise<number> {
  const result = await sql<{ total: string }[]>`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM vip_consumptions
    WHERE user_id = ${userId}
  `;
  return parseFloat(result[0].total);
}

export async function getConsumptionStats() {
  const stats = await sql<any[]>`
    SELECT
      COUNT(*) as total_transactions,
      COUNT(DISTINCT user_id) as unique_users,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(AVG(amount), 0) as avg_amount,
      currency
    FROM vip_consumptions
    GROUP BY currency
  `;

  return stats.map(s => ({
    ...s,
    total_amount: parseFloat(s.total_amount),
    avg_amount: parseFloat(s.avg_amount)
  }));
}

export async function getRecentConsumptions(limit = 100): Promise<VIPConsumptionWithDetails[]> {
  const consumptions = await sql<any[]>`
    SELECT
      vip_consumptions.*,
      users.name as user_name,
      users.email as user_email
    FROM vip_consumptions
    LEFT JOIN users ON vip_consumptions.user_id = users.id
    ORDER BY vip_consumptions.created_at DESC
    LIMIT ${limit}
  `;

  return consumptions.map(c => ({
    id: c.id,
    user_id: c.user_id,
    event_id: c.event_id,
    amount: parseFloat(c.amount),
    currency: c.currency,
    description: c.description,
    created_at: c.created_at,
    user: c.user_name ? {
      id: c.user_id,
      name: c.user_name,
      email: c.user_email,
      role: 'vip' as any,
      created_at: new Date(),
      updated_at: new Date()
    } : undefined
  }));
}
