import { sql } from '../client';
import type { AgeRange, VIPProfile, VIPProfileInput } from '@/lib/vip-profile';

/**
 * Get a VIP's profile, or null if none has been saved yet
 */
export async function getVIPProfile(userId: string): Promise<VIPProfile | null> {
  const rows = await sql`SELECT * FROM vip_profiles WHERE user_id = ${userId}`;
  return (rows[0] as VIPProfile) || null;
}

/**
 * Create or update a VIP's profile. consent_updated_at is set when any
 * consent is first given, and refreshed whenever a consent changes.
 */
export async function upsertVIPProfile(userId: string, input: VIPProfileInput): Promise<VIPProfile> {
  const p = input;
  const rows = await sql`
    INSERT INTO vip_profiles (
      user_id, phone, age_range, address_line1, address_line2, city, postcode, country,
      interests, referral_source, consent_email, consent_sms, consent_post, consent_updated_at, notes
    ) VALUES (
      ${userId}, ${p.phone ?? null}, ${p.age_range ?? null}, ${p.address_line1 ?? null},
      ${p.address_line2 ?? null}, ${p.city ?? null}, ${p.postcode ?? null}, ${p.country ?? null},
      ${p.interests ?? []}, ${p.referral_source ?? null},
      ${!!p.consent_email}, ${!!p.consent_sms}, ${!!p.consent_post},
      CASE WHEN ${!!p.consent_email} OR ${!!p.consent_sms} OR ${!!p.consent_post} THEN NOW() ELSE NULL END,
      ${p.notes ?? null}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      phone = EXCLUDED.phone,
      age_range = EXCLUDED.age_range,
      address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2,
      city = EXCLUDED.city,
      postcode = EXCLUDED.postcode,
      country = EXCLUDED.country,
      interests = EXCLUDED.interests,
      referral_source = EXCLUDED.referral_source,
      consent_updated_at = CASE
        WHEN vip_profiles.consent_email IS DISTINCT FROM EXCLUDED.consent_email
          OR vip_profiles.consent_sms IS DISTINCT FROM EXCLUDED.consent_sms
          OR vip_profiles.consent_post IS DISTINCT FROM EXCLUDED.consent_post
        THEN NOW()
        ELSE vip_profiles.consent_updated_at
      END,
      consent_email = EXCLUDED.consent_email,
      consent_sms = EXCLUDED.consent_sms,
      consent_post = EXCLUDED.consent_post,
      notes = EXCLUDED.notes
    RETURNING *
  `;
  return rows[0] as VIPProfile;
}

export interface VIPExportFilters {
  consent?: 'email' | 'sms' | 'post';
  ageRange?: AgeRange;
  city?: string;
}

export interface VIPExportRow {
  name: string;
  email: string;
  phone: string | null;
  age_range: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  interests: string[];
  referral_source: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  consent_post: boolean;
  consent_updated_at: string | null;
  tier: string | null;
  points_balance: number | null;
  registered_at: string;
}

/**
 * VIPs with their profile and membership, for marketing exports
 */
export async function getVIPsForExport(filters: VIPExportFilters = {}): Promise<VIPExportRow[]> {
  const conditions = [`u.role = 'vip'`];
  const params: unknown[] = [];

  if (filters.consent) {
    // Column name comes from a fixed whitelist, never from user input
    const column = { email: 'consent_email', sms: 'consent_sms', post: 'consent_post' }[filters.consent];
    conditions.push(`p.${column} = TRUE`);
  }
  if (filters.ageRange) {
    params.push(filters.ageRange);
    conditions.push(`p.age_range = $${params.length}`);
  }
  if (filters.city) {
    params.push(filters.city.trim());
    conditions.push(`LOWER(p.city) = LOWER($${params.length})`);
  }

  // Dynamic SQL: neon 1.x only accepts sql`...` templates when called directly
  const rows = await sql.query(
    `SELECT u.name, u.email, p.phone, p.age_range, p.address_line1, p.address_line2, p.city,
            p.postcode, p.country, COALESCE(p.interests, '{}') AS interests, p.referral_source,
            COALESCE(p.consent_email, FALSE) AS consent_email,
            COALESCE(p.consent_sms, FALSE) AS consent_sms,
            COALESCE(p.consent_post, FALSE) AS consent_post,
            p.consent_updated_at, m.tier, m.points_balance, u.created_at AS registered_at
     FROM users u
     LEFT JOIN vip_profiles p ON p.user_id = u.id
     LEFT JOIN vip_memberships m ON m.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.name`,
    params
  );
  return rows as VIPExportRow[];
}
