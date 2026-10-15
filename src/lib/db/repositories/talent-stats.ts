import { sql } from '../client';
import {
  PROFILE_STAT_KEYS,
  readSettings,
  type ProfileStatDetails,
  type ProfileStatKey,
  type ProfileStatSetting,
} from '@/lib/talents/profile-stats';

/**
 * A talent's profile figures: counted from bookings and events, plus the
 * admin's additions. Only finished work counts, so the numbers go up by
 * themselves as jobs and events pass. Null if the talent doesn't exist.
 */
export async function getTalentProfileStats(talentId: string): Promise<ProfileStatDetails | null> {
  const rows = await sql`
    WITH done AS (
      SELECT b.event_id, b.organisation_id FROM bookings b
      WHERE b.talent_id = ${talentId}::uuid AND b.status IN ('confirmed', 'completed') AND b.ends_at < NOW()
    )
    SELECT t.profile_stats,
      (SELECT COUNT(*) FROM done WHERE event_id IS NULL)::int AS jobs,
      (SELECT COUNT(*) FROM events e
        WHERE e.status <> 'cancelled' AND COALESCE(e.end_time, e.start_time) < NOW()
          AND (t.id::text = ANY(e.talent_ids) OR e.id IN (SELECT event_id FROM done WHERE event_id IS NOT NULL))
      )::int AS events,
      (SELECT COUNT(DISTINCT organisation_id) FROM done)::int AS clients
    FROM talents t WHERE t.id = ${talentId}::uuid
  `;
  const row = rows[0];
  if (!row) return null;
  const settings = readSettings(row.profile_stats);
  const out = {} as ProfileStatDetails;
  for (const key of PROFILE_STAT_KEYS) {
    const counted = Number(row[key] ?? 0);
    out[key] = { counted, ...settings[key], total: counted + settings[key].extra };
  }
  return out;
}

export async function saveTalentProfileStats(
  talentId: string,
  settings: Record<ProfileStatKey, ProfileStatSetting>
): Promise<boolean> {
  const rows = await sql`
    UPDATE talents SET profile_stats = ${JSON.stringify(readSettings(settings))}::jsonb, updated_at = NOW()
    WHERE id = ${talentId}::uuid RETURNING id
  `;
  return rows.length > 0;
}
