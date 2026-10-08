import { sql } from '../client';
import { netCents, payoutState } from '@/lib/bookings/types';
import { getCurrentMembership } from '@/lib/services/vip-points-service';
import { getTierProgress, getTierSettings } from '@/lib/services/vip-tiers';
import { getBenefitsByTier } from './vip-tier-benefits';
import { updateTalent } from './talents';
import type {
  AdminPerk,
  ArtistPerk,
  EarningsSummary,
  PointsEntry,
  PortalProfile,
  ProfileChangeRequest,
  ProfileFields,
  RewardsSummary,
  TalentAvailability,
  TalentBooking,
  TalentLogin,
  Tier,
} from '@/lib/portal/types';

/**
 * Data for the talent portal. Every query is fixed to one talent, taken from
 * the session. Talent-facing bookings never include the gross fee or the
 * commission, and only include the client's name when the agency chose to.
 */

const TIERS: Tier[] = ['silver', 'gold', 'black'];

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function dateOnly(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Bookings, as the talent sees them
// ---------------------------------------------------------------------------

const talentBookingSelect = () => sql`
  SELECT b.*, CASE WHEN b.client_visible_to_talent THEN o.name ELSE NULL END AS visible_client_name
  FROM bookings b
  LEFT JOIN organisations o ON o.id = b.organisation_id
`;

function mapTalentBooking(row: any): TalentBooking {
  const fee = row.fee_cents === null ? null : Number(row.fee_cents);
  const pct = row.commission_percent === null ? null : Number(row.commission_percent);
  const startsAt = iso(row.starts_at)!;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    starts_at: startsAt,
    ends_at: iso(row.ends_at)!,
    location: row.location,
    call_time: row.call_time,
    brief: row.brief,
    logistics_notes: row.logistics_notes,
    onsite_contact: row.onsite_contact ?? {},
    client_name: row.visible_client_name ?? null,
    net_cents: netCents(fee, pct),
    currency: row.currency,
    talent_response: row.talent_response,
    can_respond: (row.status === 'hold' || row.status === 'confirmed') && new Date(startsAt) > new Date(),
    payout: payoutState({ status: row.status, ends_at: iso(row.ends_at)!, fee_cents: fee, paid_at: iso(row.talent_paid_at) }),
    paid_at: iso(row.talent_paid_at),
    paid_cents: row.talent_paid_cents === null || row.talent_paid_cents === undefined ? null : Number(row.talent_paid_cents),
  };
}

export async function listTalentBookings(talentId: string, when: 'upcoming' | 'past', limit = 200): Promise<TalentBooking[]> {
  const rows =
    when === 'upcoming'
      ? await sql`
          ${talentBookingSelect()}
          WHERE b.talent_id = ${talentId} AND b.shared_with_talent AND b.ends_at >= NOW()
          ORDER BY b.starts_at ASC
          LIMIT ${limit}
        `
      : await sql`
          ${talentBookingSelect()}
          WHERE b.talent_id = ${talentId} AND b.shared_with_talent AND b.ends_at < NOW()
          ORDER BY b.starts_at DESC
          LIMIT ${limit}
        `;
  return rows.map(mapTalentBooking);
}

export async function getTalentBooking(talentId: string, bookingId: string): Promise<TalentBooking | null> {
  const rows = await sql`
    ${talentBookingSelect()}
    WHERE b.id = ${bookingId} AND b.talent_id = ${talentId} AND b.shared_with_talent
    LIMIT 1
  `;
  return rows[0] ? mapTalentBooking(rows[0]) : null;
}

/** Record the talent's answer; logged on the deal's timeline so the team sees it */
export async function respondToBooking(
  talent: { userId: string; talentId: string; talentName: string },
  bookingId: string,
  response: 'accepted' | 'declined',
  note: string | null
): Promise<boolean> {
  const rows = await sql`
    UPDATE bookings SET talent_response = ${response}, updated_at = NOW()
    WHERE id = ${bookingId} AND talent_id = ${talent.talentId} AND shared_with_talent
      AND status IN ('hold', 'confirmed') AND starts_at > NOW()
    RETURNING deal_id, title
  `;
  if (rows.length === 0) return false;

  const { deal_id, title } = rows[0];
  if (deal_id) {
    await sql`
      INSERT INTO activities (type, subject, body, deal_id, organisation_id, completed_at, created_by_name)
      VALUES ('system', ${`${talent.talentName} ${response} “${title}”`}, ${note},
              ${deal_id}, (SELECT organisation_id FROM deals WHERE id = ${deal_id}), NOW(), ${talent.talentName})
    `;
  }
  return true;
}

/**
 * The talent's money: what's been paid (this year), what's owed for work
 * already done, and what's to come from confirmed bookings. Owed work is
 * included however old it is, so nothing unpaid drops off the list.
 */
export async function getEarnings(talentId: string): Promise<EarningsSummary> {
  const rows = await sql`
    ${talentBookingSelect()}
    WHERE b.talent_id = ${talentId} AND b.shared_with_talent
      AND (
        (b.talent_paid_at IS NOT NULL AND b.talent_paid_at >= date_trunc('year', NOW()) - INTERVAL '1 year')
        OR (b.talent_paid_at IS NULL AND b.status IN ('confirmed', 'completed') AND b.fee_cents IS NOT NULL)
      )
    ORDER BY b.starts_at DESC
  `;
  const bookings = rows.map(mapTalentBooking);
  const thisYear = new Date().getFullYear();
  const totals = new Map<string, { paid_this_year: number; owed: number; upcoming: number }>();

  for (const booking of bookings) {
    const entry = totals.get(booking.currency) ?? { paid_this_year: 0, owed: 0, upcoming: 0 };
    if (booking.payout === 'paid') {
      if (new Date(booking.paid_at!).getFullYear() === thisYear) entry.paid_this_year += booking.paid_cents ?? 0;
    } else if (booking.payout === 'owed') {
      entry.owed += booking.net_cents ?? 0;
    } else if (booking.payout === 'upcoming') {
      entry.upcoming += booking.net_cents ?? 0;
    }
    totals.set(booking.currency, entry);
  }

  return {
    currency_totals: [...totals.entries()].map(([currency, t]) => ({ currency, ...t })),
    bookings,
  };
}

// ---------------------------------------------------------------------------
// Availability (the talent's own unavailable days)
// ---------------------------------------------------------------------------

export async function listTalentAvailability(talentId: string): Promise<TalentAvailability[]> {
  const rows = await sql`
    SELECT id, starts_on, ends_on, kind, note FROM talent_availability
    WHERE talent_id = ${talentId} AND ends_on >= CURRENT_DATE - 30
    ORDER BY starts_on
  `;
  return rows.map((row: any) => ({
    id: row.id,
    starts_on: dateOnly(row.starts_on)!,
    ends_on: dateOnly(row.ends_on)!,
    kind: row.kind,
    note: row.note,
  }));
}

export async function addTalentAvailability(
  talent: { userId: string; talentId: string },
  data: { starts_on: string; ends_on: string; kind: 'unavailable' | 'tentative'; note: string | null }
): Promise<void> {
  await sql`
    INSERT INTO talent_availability (talent_id, starts_on, ends_on, kind, note, created_by)
    VALUES (${talent.talentId}, ${data.starts_on}, ${data.ends_on}, ${data.kind}, ${data.note}, ${talent.userId})
  `;
}

export async function removeTalentAvailability(talentId: string, id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM talent_availability WHERE id = ${id} AND talent_id = ${talentId} RETURNING id`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Points and perks
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  event_checkin: 'Checked in at an event',
  consumption: 'Purchase at an event',
  manual_adjust: 'Adjustment by VersaTalent',
  tier_bonus: 'Tier bonus',
};

async function listPointsHistory(userId: string, limit = 30): Promise<PointsEntry[]> {
  const rows = await sql`
    SELECT l.id, l.source, l.delta_points, l.balance_after, l.created_at, l.metadata, ne.name AS event_name
    FROM vip_points_log l
    LEFT JOIN checkins c ON l.source = 'event_checkin' AND c.id::text = l.metadata->>'checkin_id'
    LEFT JOIN nfc_events ne ON ne.id = c.event_id
    WHERE l.user_id = ${userId}
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row: any) => ({
    id: row.id,
    source: row.source,
    delta_points: Number(row.delta_points),
    balance_after: Number(row.balance_after),
    label: row.event_name ? `Checked in at ${row.event_name}` : SOURCE_LABELS[row.source] ?? 'Points',
    created_at: iso(row.created_at)!,
  }));
}

/** Perks that apply to this talent now, with tier-locked ones flagged */
async function listPerksForTalent(talentId: string, tier: Tier | null): Promise<ArtistPerk[]> {
  const rows = await sql`
    SELECT id, title, description, talent_id, min_tier, valid_until
    FROM artist_perks
    WHERE is_active
      AND (talent_id IS NULL OR talent_id = ${talentId})
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
    ORDER BY sort_order, created_at
  `;
  const rank = (t: Tier | null) => (t ? TIERS.indexOf(t) : -1);
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    min_tier: row.min_tier,
    valid_until: dateOnly(row.valid_until),
    just_for_you: row.talent_id !== null,
    unlocked: !row.min_tier || rank(tier) >= rank(row.min_tier),
  }));
}

export async function getRewards(talent: { userId: string; talentId: string }): Promise<RewardsSummary> {
  const membership = await getCurrentMembership(talent.userId);
  const tier = (membership?.tier ?? null) as Tier | null;

  const [history, perks, benefits] = await Promise.all([
    listPointsHistory(talent.userId),
    listPerksForTalent(talent.talentId, tier),
    tier ? getBenefitsByTier(tier, true) : Promise.resolve([]),
  ]);

  let summary: RewardsSummary['membership'] = null;
  if (membership) {
    const progress = getTierProgress(membership, await getTierSettings());
    summary = {
      tier: membership.tier as Tier,
      points_balance: membership.points_balance,
      lifetime_points: membership.lifetime_points,
      status_points: membership.status_points,
      year_ends: progress.year_ends,
      next_tier: progress.next_tier as Tier | null,
      points_to_next: progress.points_to_next,
      points_to_keep: progress.points_to_keep,
      discount_percent: progress.discount_percent,
    };
  }

  return {
    membership: summary,
    history,
    tier_benefits: benefits.map((b) => ({ title: b.title, description: b.description ?? null })),
    perks,
  };
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export async function getTalentBasics(talentId: string) {
  const rows = await sql`SELECT id, name, profession, image_src, tagline, bio, location, skills, social_links FROM talents WHERE id = ${talentId}`;
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Profile change requests
// ---------------------------------------------------------------------------

function mapChange(row: any): ProfileChangeRequest {
  return {
    id: row.id,
    talent: { id: row.talent_id, name: row.talent_name },
    submitted_by_name: row.submitted_by_name ?? null,
    changes: row.changes ?? {},
    note: row.note,
    status: row.status,
    review_note: row.review_note,
    created_at: iso(row.created_at)!,
    reviewed_at: iso(row.reviewed_at),
  };
}

const changeSelect = () => sql`
  SELECT pc.*, t.name AS talent_name, u.name AS submitted_by_name
  FROM talent_profile_changes pc
  JOIN talents t ON t.id = pc.talent_id
  LEFT JOIN users u ON u.id = pc.submitted_by
`;

export async function getPortalProfile(talentId: string): Promise<PortalProfile | null> {
  const talent = await getTalentBasics(talentId);
  if (!talent) return null;
  const [pending, last] = await Promise.all([
    sql`${changeSelect()} WHERE pc.talent_id = ${talentId} AND pc.status = 'pending' LIMIT 1`,
    sql`${changeSelect()} WHERE pc.talent_id = ${talentId} AND pc.status IN ('approved', 'rejected') ORDER BY pc.reviewed_at DESC LIMIT 1`,
  ]);
  return {
    talent_id: talent.id,
    name: talent.name,
    profession: talent.profession,
    image_src: talent.image_src,
    current: {
      tagline: talent.tagline ?? '',
      bio: talent.bio ?? '',
      location: talent.location ?? '',
      skills: talent.skills ?? [],
      social_links: talent.social_links ?? {},
    },
    pending: pending[0] ? mapChange(pending[0]) : null,
    last_decision: last[0] ? mapChange(last[0]) : null,
  };
}

/** Submit (or replace) the talent's pending change request */
export async function submitProfileChange(
  talent: { userId: string; talentId: string },
  changes: Partial<ProfileFields>,
  note: string | null
): Promise<void> {
  await sql.transaction([
    sql`UPDATE talent_profile_changes SET status = 'withdrawn' WHERE talent_id = ${talent.talentId} AND status = 'pending'`,
    sql`
      INSERT INTO talent_profile_changes (talent_id, submitted_by, changes, note)
      VALUES (${talent.talentId}, ${talent.userId}, ${JSON.stringify(changes)}, ${note})
    `,
  ]);
}

export async function withdrawProfileChange(talentId: string): Promise<void> {
  await sql`UPDATE talent_profile_changes SET status = 'withdrawn' WHERE talent_id = ${talentId} AND status = 'pending'`;
}

export async function listProfileChanges(status: 'pending' | 'all'): Promise<ProfileChangeRequest[]> {
  const rows =
    status === 'pending'
      ? await sql`${changeSelect()} WHERE pc.status = 'pending' ORDER BY pc.created_at`
      : await sql`${changeSelect()} WHERE pc.status <> 'withdrawn' ORDER BY pc.created_at DESC LIMIT 50`;
  return rows.map(mapChange);
}

/**
 * Approve or reject a pending request. Approving applies the changes to the
 * public profile through updateTalent, which also clears the talent caches.
 */
export async function reviewProfileChange(
  reviewerId: string | null,
  id: string,
  decision: 'approved' | 'rejected',
  reviewNote: string | null
): Promise<ProfileChangeRequest | null> {
  const claimed = await sql`
    UPDATE talent_profile_changes SET status = ${decision}, reviewed_by = ${reviewerId}, reviewed_at = NOW(), review_note = ${reviewNote}
    WHERE id = ${id} AND status = 'pending'
    RETURNING id, talent_id, changes
  `;
  if (claimed.length === 0) return null;

  if (decision === 'approved') {
    const { talent_id, changes } = claimed[0];
    const current = await getTalentBasics(talent_id);
    const update: Record<string, unknown> = {};
    for (const key of ['tagline', 'bio', 'location', 'skills'] as const) {
      if (changes[key] !== undefined) update[key] = changes[key];
    }
    if (changes.social_links) {
      update.social_links = { ...(current?.social_links ?? {}), ...changes.social_links };
    }
    await updateTalent(talent_id, update);
  }

  const rows = await sql`${changeSelect()} WHERE pc.id = ${id}`;
  return rows[0] ? mapChange(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Admin: perks and talent logins
// ---------------------------------------------------------------------------

export async function listAllPerks(): Promise<AdminPerk[]> {
  const rows = await sql`
    SELECT p.*, t.name AS talent_name FROM artist_perks p LEFT JOIN talents t ON t.id = p.talent_id
    ORDER BY p.is_active DESC, p.sort_order, p.created_at
  `;
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    talent: row.talent_id ? { id: row.talent_id, name: row.talent_name } : null,
    min_tier: row.min_tier,
    valid_from: dateOnly(row.valid_from),
    valid_until: dateOnly(row.valid_until),
    is_active: row.is_active,
    sort_order: Number(row.sort_order),
  }));
}

export interface PerkInput {
  title: string;
  description: string | null;
  talent_id: string | null;
  min_tier: Tier | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
}

/** Request body (already validated) → perk fields, with defaults */
export function toPerkInput(data: Record<string, any>): PerkInput {
  return {
    title: data.title,
    description: data.description ?? null,
    talent_id: data.talent_id ?? null,
    min_tier: data.min_tier ?? null,
    valid_from: data.valid_from ?? null,
    valid_until: data.valid_until ?? null,
    is_active: data.is_active ?? true,
    sort_order: data.sort_order ?? 0,
  };
}

export async function createPerk(data: PerkInput): Promise<string> {
  const rows = await sql`
    INSERT INTO artist_perks (title, description, talent_id, min_tier, valid_from, valid_until, is_active, sort_order)
    VALUES (${data.title}, ${data.description}, ${data.talent_id}, ${data.min_tier}, ${data.valid_from}, ${data.valid_until},
            ${data.is_active}, ${data.sort_order})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updatePerk(id: string, data: PerkInput): Promise<boolean> {
  const rows = await sql`
    UPDATE artist_perks SET
      title = ${data.title}, description = ${data.description}, talent_id = ${data.talent_id}, min_tier = ${data.min_tier},
      valid_from = ${data.valid_from}, valid_until = ${data.valid_until}, is_active = ${data.is_active},
      sort_order = ${data.sort_order}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deletePerk(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM artist_perks WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function listTalentLogins(): Promise<TalentLogin[]> {
  const rows = await sql`
    SELECT t.id AS talent_id, t.name AS talent_name, t.is_active AS talent_active,
      u.id AS user_id, u.name AS user_name, u.email, (u.password_hash IS NOT NULL) AS has_password,
      u.is_active AS user_active, u.last_login_at,
      (SELECT MAX(expires_at) FROM auth_tokens a WHERE a.user_id = u.id AND a.used_at IS NULL AND a.expires_at > NOW()) AS link_expires_at
    FROM talents t
    LEFT JOIN users u ON u.talent_id = t.id AND u.role = 'artist'
    ORDER BY t.is_active DESC, t.name
  `;
  return rows.map((row: any) => ({
    talent_id: row.talent_id,
    talent_name: row.talent_name,
    is_active_talent: row.talent_active,
    user: row.user_id
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.email,
          has_password: row.has_password,
          is_active: row.user_active,
          last_login_at: iso(row.last_login_at),
          link_expires_at: iso(row.link_expires_at),
        }
      : null,
  }));
}

export async function getArtistUser(userId: string): Promise<{ id: string; name: string; is_active: boolean; has_password: boolean } | null> {
  const rows = await sql`
    SELECT id, name, is_active, (password_hash IS NOT NULL) AS has_password FROM users WHERE id = ${userId} AND role = 'artist'
  `;
  return rows[0] ?? null;
}

export async function createArtistUser(talentId: string, name: string, email: string): Promise<string> {
  const rows = await sql`
    INSERT INTO users (name, email, role, talent_id, is_active) VALUES (${name}, ${email}, 'artist', ${talentId}, true)
    RETURNING id
  `;
  return rows[0].id;
}

export async function setArtistUserActive(userId: string, active: boolean): Promise<void> {
  await sql`UPDATE users SET is_active = ${active}, updated_at = NOW() WHERE id = ${userId} AND role = 'artist'`;
}
