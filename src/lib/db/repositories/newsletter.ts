import { sql, query } from '../client';
import type { NewsletterSubscriber, CreateNewsletterSubscriberRequest, UpdateNewsletterSubscriberRequest } from '../types';

// Helper function to map database row to NewsletterSubscriber
function mapRowToSubscriber(row: any): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    is_active: row.is_active !== false,
    subscribed_at: new Date(row.subscribed_at),
    unsubscribed_at: row.unsubscribed_at ? new Date(row.unsubscribed_at) : undefined,
    source: row.source || 'website',
    metadata: row.metadata || {},
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

/**
 * Get all newsletter subscribers with optional filters
 */
export async function getAllSubscribers(options?: {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NewsletterSubscriber[]> {
  const { activeOnly = true, limit, offset } = options || {};

  let baseQuery = `SELECT * FROM newsletter_subscribers WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (activeOnly) {
    baseQuery += ` AND is_active = true`;
  }

  baseQuery += ` ORDER BY subscribed_at DESC`;

  if (limit) {
    baseQuery += ` LIMIT $${paramIndex}`;
    params.push(limit);
    paramIndex++;
  }

  if (offset) {
    baseQuery += ` OFFSET $${paramIndex}`;
    params.push(offset);
  }

  const rows = await query(baseQuery, params);
  return rows.map(mapRowToSubscriber);
}

/**
 * Get subscriber count
 */
export async function getSubscriberCount(activeOnly?: boolean): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM newsletter_subscribers
    WHERE ${activeOnly !== false ? sql`is_active = true` : sql`1=1`}
  `;
  return parseInt(result[0].count);
}

/**
 * Get subscriber by ID
 */
export async function getSubscriberById(id: string): Promise<NewsletterSubscriber | null> {
  try {
    const rows = await sql`
      SELECT * FROM newsletter_subscribers
      WHERE id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return mapRowToSubscriber(rows[0]);
  } catch (error: any) {
    if (error.code === '22P02') {
      return null;
    }
    throw error;
  }
}

/**
 * Get subscriber by email
 */
export async function getSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
  const rows = await sql`
    SELECT * FROM newsletter_subscribers
    WHERE email = ${email.toLowerCase()}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return mapRowToSubscriber(rows[0]);
}

/**
 * Create or reactivate a newsletter subscriber
 */
export async function createSubscriber(data: CreateNewsletterSubscriberRequest): Promise<{ subscriber: NewsletterSubscriber; isNew: boolean }> {
  const email = data.email.toLowerCase();

  // Check if subscriber already exists
  const existing = await getSubscriberByEmail(email);

  if (existing) {
    // If subscriber exists but is inactive, reactivate them
    if (!existing.is_active) {
      const reactivated = await sql`
        UPDATE newsletter_subscribers
        SET is_active = true, unsubscribed_at = NULL, subscribed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.id}
        RETURNING *
      `;
      return { subscriber: mapRowToSubscriber(reactivated[0]), isNew: false };
    }
    // Already active subscriber
    return { subscriber: existing, isNew: false };
  }

  // Create new subscriber
  const rows = await sql`
    INSERT INTO newsletter_subscribers (
      email, name, source, metadata
    ) VALUES (
      ${email},
      ${data.name || null},
      ${data.source || 'website'},
      ${JSON.stringify(data.metadata || {})}
    )
    RETURNING *
  `;

  return { subscriber: mapRowToSubscriber(rows[0]), isNew: true };
}

/**
 * Update a subscriber
 */
export async function updateSubscriber(
  id: string,
  data: UpdateNewsletterSubscriberRequest
): Promise<NewsletterSubscriber | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(data.is_active);

    // Set unsubscribed_at when deactivating
    if (!data.is_active) {
      updates.push(`unsubscribed_at = CURRENT_TIMESTAMP`);
    } else {
      updates.push(`unsubscribed_at = NULL`);
    }
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`);
    params.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) {
    return getSubscriberById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const queryText = `
    UPDATE newsletter_subscribers
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, params);

  if (result.length === 0) {
    return null;
  }

  return mapRowToSubscriber(result[0]);
}

/**
 * Unsubscribe by email
 */
export async function unsubscribeByEmail(email: string): Promise<boolean> {
  const result = await sql`
    UPDATE newsletter_subscribers
    SET is_active = false, unsubscribed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE email = ${email.toLowerCase()} AND is_active = true
  `;
  return result.count > 0;
}

/**
 * Delete a subscriber permanently
 */
export async function deleteSubscriber(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM newsletter_subscribers
    WHERE id = ${id}
  `;
  return result.count > 0;
}

/**
 * Search subscribers by email or name
 */
export async function searchSubscribers(searchTerm: string): Promise<NewsletterSubscriber[]> {
  const rows = await sql`
    SELECT * FROM newsletter_subscribers
    WHERE email ILIKE ${'%' + searchTerm + '%'}
      OR name ILIKE ${'%' + searchTerm + '%'}
    ORDER BY subscribed_at DESC
  `;

  return rows.map(mapRowToSubscriber);
}

/**
 * Export all active subscribers (for email marketing)
 */
export async function exportActiveSubscribers(): Promise<Array<{ email: string; name?: string }>> {
  const rows = await sql`
    SELECT email, name FROM newsletter_subscribers
    WHERE is_active = true
    ORDER BY subscribed_at DESC
  `;

  return rows.map((row: any) => ({
    email: row.email,
    name: row.name || undefined,
  }));
}
