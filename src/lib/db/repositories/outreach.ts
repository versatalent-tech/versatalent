import { sql } from '../client';
import { getTierSettings } from '@/lib/services/vip-tiers';
import { expireMemberships } from './founding';
import {
  CAMPAIGNS,
  CAMPAIGN_KEYS,
  defaultCampaignSettings,
  type CampaignKey,
  type CampaignSettings,
  type CampaignSettingsMap,
  type Channel,
  type OutreachCandidate,
  type OutreachLogEntry,
} from '@/lib/outreach/types';

/**
 * The outreach queue: lists of members to contact, worked out from their
 * activity. Staff send the messages themselves and mark them sent, which
 * takes the member off the list (for good, or until the cooldown ends).
 */

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

const ukDate = (value: unknown) =>
  new Date(String(iso(value))).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export async function getCampaignSettings(): Promise<CampaignSettingsMap> {
  const rows = await sql`SELECT value FROM programme_settings WHERE key = 'outreach_campaigns'`;
  const saved = (rows[0]?.value ?? {}) as Partial<Record<CampaignKey, Partial<CampaignSettings>>>;
  const defaults = defaultCampaignSettings();
  for (const key of CAMPAIGN_KEYS) defaults[key] = { ...defaults[key], ...(saved[key] ?? {}) };
  return defaults;
}

export async function updateCampaignSettings(key: CampaignKey, changes: Partial<CampaignSettings>, userId: string | null): Promise<CampaignSettingsMap> {
  const current = await getCampaignSettings();
  const next = { ...current, [key]: { ...current[key], ...changes } };
  await sql`
    INSERT INTO programme_settings (key, value, updated_by, updated_at)
    VALUES ('outreach_campaigns', ${JSON.stringify(next)}, ${userId}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  `;
  return next;
}

/** Members with an active programme membership, their contact details and consent */
const memberBase = () => sql`
  SELECT u.id AS user_id, u.name, u.email, p.phone,
    COALESCE(p.consent_email, false) AS consent_email, COALESCE(p.consent_sms, false) AS consent_sms,
    m.points_balance, m.status_points, m.tier, m.created_at AS joined_at,
    rc.code AS referral_code, f.founding_number
  FROM users u
  JOIN vip_memberships m ON m.user_id = u.id AND m.status = 'active'
  LEFT JOIN vip_profiles p ON p.user_id = u.id
  LEFT JOIN member_referral_codes rc ON rc.user_id = u.id
  LEFT JOIN founding_members f ON f.user_id = u.id
  WHERE u.is_active AND u.role IN ('vip', 'artist')
`;

interface Row {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  points_balance: number;
  status_points: number;
  tier: string;
  referral_code: string | null;
  founding_number: number | null;
  last_contacted_at?: unknown;
  [key: string]: unknown;
}

function candidate(row: Row, origin: string, detail: string, dedupeKey: string | null, extra: Record<string, string> = {}): OutreachCandidate {
  return {
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    consent_email: Boolean(row.consent_email),
    consent_sms: Boolean(row.consent_sms),
    detail,
    dedupe_key: dedupeKey,
    last_contacted_at: iso(row.last_contacted_at ?? null),
    values: {
      first_name: String(row.name).split(' ')[0],
      pass_link: `${origin}/vip/${row.user_id}`,
      events_link: `${origin}/events`,
      points: Number(row.points_balance).toLocaleString('en-GB'),
      tier: titleCase(row.tier),
      founding_number: row.founding_number ? String(row.founding_number).padStart(3, '0') : '',
      referral_link: row.referral_code ? `${origin}/membership?ref=${row.referral_code}#join` : `${origin}/membership`,
      ...extra,
    },
  };
}

/** Who should get this campaign's message now */
export async function listCandidates(key: CampaignKey, origin: string): Promise<OutreachCandidate[]> {
  const settings = (await getCampaignSettings())[key];
  // Founding years that ran out are marked expired when read; make sure they are before listing
  if (key === 'founding_renewal' || key === 'founding_lapsed') await expireMemberships();
  const consent = CAMPAIGNS[key].needs_consent ? sql`AND (x.consent_email OR x.consent_sms)` : sql``;
  const cooldown = Math.max(0, settings.cooldown_days);
  const lastContact = sql`(SELECT MAX(o.created_at) FROM outreach_log o WHERE o.campaign = ${key} AND o.user_id = x.user_id)`;
  const notInCooldown = sql`AND NOT EXISTS (
    SELECT 1 FROM outreach_log o WHERE o.campaign = ${key} AND o.user_id = x.user_id
      AND o.created_at > NOW() - make_interval(days => ${cooldown}::integer)
  )`;

  switch (key) {
    case 'welcome': {
      const rows = (await sql`
        SELECT x.*, ${lastContact} AS last_contacted_at FROM (${memberBase()}) x
        WHERE x.joined_at > NOW() - INTERVAL '14 days' ${consent}
          AND NOT EXISTS (SELECT 1 FROM outreach_log o WHERE o.campaign = 'welcome' AND o.dedupe_key = 'welcome:' || x.user_id)
        ORDER BY x.joined_at
      `) as Row[];
      return rows.map((r) => candidate(r, origin, `Joined ${ukDate(r.joined_at)}`, `welcome:${r.user_id}`));
    }
    case 'post_event': {
      const rows = (await sql`
        SELECT DISTINCT ON (x.user_id, ne.id) x.*, ne.id AS event_id, ne.name AS event_name, c.timestamp AS checked_in_at,
          ${lastContact} AS last_contacted_at
        FROM (${memberBase()}) x
        JOIN checkins c ON c.user_id = x.user_id AND c.timestamp > NOW() - INTERVAL '3 days' AND c.event_id IS NOT NULL
        JOIN nfc_events ne ON ne.id = c.event_id
        WHERE true ${consent}
          AND NOT EXISTS (SELECT 1 FROM outreach_log o WHERE o.campaign = 'post_event' AND o.dedupe_key = 'post_event:' || ne.id || ':' || x.user_id)
        ORDER BY x.user_id, ne.id, c.timestamp
      `) as Row[];
      return rows.map((r) =>
        candidate(r, origin, `Checked in at ${r.event_name} on ${ukDate(r.checked_in_at)}`, `post_event:${r.event_id}:${r.user_id}`, {
          event: String(r.event_name),
        })
      );
    }
    case 'inactive': {
      const rows = (await sql`
        SELECT x.*, last.at AS last_checkin, ${lastContact} AS last_contacted_at
        FROM (${memberBase()}) x
        LEFT JOIN LATERAL (SELECT MAX(c.timestamp) AS at FROM checkins c WHERE c.user_id = x.user_id) last ON true
        WHERE COALESCE(last.at, x.joined_at) < NOW() - INTERVAL '60 days' ${consent} ${notInCooldown}
        ORDER BY COALESCE(last.at, x.joined_at)
      `) as Row[];
      return rows.map((r) =>
        candidate(r, origin, r.last_checkin ? `Last check-in ${ukDate(r.last_checkin)}` : `Joined ${ukDate(r.joined_at)}, never checked in`, null)
      );
    }
    case 'near_tier': {
      const { thresholds } = await getTierSettings();
      const rows = (await sql`
        SELECT x.*, ${lastContact} AS last_contacted_at FROM (${memberBase()}) x
        WHERE ((x.tier = 'silver' AND x.status_points >= ${Math.ceil(thresholds.gold * 0.75)} AND x.status_points < ${thresholds.gold})
            OR (x.tier = 'gold' AND x.status_points >= ${Math.ceil(thresholds.black * 0.75)} AND x.status_points < ${thresholds.black}))
          ${consent} ${notInCooldown}
        ORDER BY x.status_points DESC
      `) as Row[];
      return rows.map((r) => {
        const next = r.tier === 'silver' ? 'gold' : 'black';
        const toNext = thresholds[next] - Number(r.status_points);
        return candidate(r, origin, `${Number(r.status_points).toLocaleString('en-GB')} status points, ${toNext} to ${titleCase(next)}`, null, {
          next_tier: titleCase(next),
          points_to_next: toNext.toLocaleString('en-GB'),
        });
      });
    }
    case 'founding_renewal': {
      const rows = (await sql`
        SELECT x.*, pm.id AS membership_id, pm.ends_at, ${lastContact} AS last_contacted_at
        FROM (${memberBase()}) x
        JOIN paid_memberships pm ON pm.user_id = x.user_id AND pm.status = 'active'
          AND pm.starts_at <= NOW() AND pm.ends_at > NOW() AND pm.ends_at <= NOW() + INTERVAL '30 days'
        WHERE NOT EXISTS (SELECT 1 FROM paid_memberships n WHERE n.user_id = x.user_id AND n.status = 'active' AND n.starts_at >= pm.ends_at)
          AND NOT EXISTS (SELECT 1 FROM outreach_log o WHERE o.campaign = 'founding_renewal' AND o.dedupe_key = 'founding_renewal:' || pm.id)
        ORDER BY pm.ends_at
      `) as Row[];
      return rows.map((r) =>
        candidate(r, origin, `Ends ${ukDate(r.ends_at)}`, `founding_renewal:${r.membership_id}`, { ends_on: ukDate(r.ends_at) })
      );
    }
    case 'founding_lapsed': {
      const rows = (await sql`
        SELECT DISTINCT ON (x.user_id) x.*, pm.id AS membership_id, pm.ends_at, ${lastContact} AS last_contacted_at
        FROM (${memberBase()}) x
        JOIN paid_memberships pm ON pm.user_id = x.user_id AND pm.status = 'expired' AND pm.ends_at > NOW() - INTERVAL '60 days'
        WHERE NOT EXISTS (SELECT 1 FROM paid_memberships n WHERE n.user_id = x.user_id AND n.status = 'active')
          ${consent}
          AND NOT EXISTS (SELECT 1 FROM outreach_log o WHERE o.campaign = 'founding_lapsed' AND o.dedupe_key = 'founding_lapsed:' || pm.id)
        ORDER BY x.user_id, pm.ends_at DESC
      `) as Row[];
      return rows.map((r) =>
        candidate(r, origin, `Ended ${ukDate(r.ends_at)}`, `founding_lapsed:${r.membership_id}`, { ends_on: ukDate(r.ends_at) })
      );
    }
  }
  return [];
}

/** How many are waiting in each enabled campaign (dashboard and tabs) */
export async function countCandidates(origin: string): Promise<Record<CampaignKey, number>> {
  const settings = await getCampaignSettings();
  const entries = await Promise.all(
    CAMPAIGN_KEYS.map(async (key) => [key, settings[key].enabled ? (await listCandidates(key, origin)).length : 0] as const)
  );
  return Object.fromEntries(entries) as Record<CampaignKey, number>;
}

/** Record contacts made by hand. A one-off already marked isn't recorded twice. */
export async function logContacts(
  entries: { user_id: string; dedupe_key: string | null }[],
  campaign: CampaignKey,
  channel: Channel,
  note: string | null,
  actorId: string | null
): Promise<number> {
  if (entries.length === 0) return 0;
  const results = await sql.transaction(
    entries.map(
      (e) => sql`
        INSERT INTO outreach_log (user_id, campaign, dedupe_key, channel, note, sent_by)
        VALUES (${e.user_id}, ${campaign}, ${e.dedupe_key}, ${channel}, ${note}, ${actorId})
        ON CONFLICT (campaign, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
        RETURNING id
      `
    )
  );
  return (results as unknown[][]).filter((r) => r.length > 0).length;
}

export async function listOutreachLog(limit = 200): Promise<OutreachLogEntry[]> {
  const rows = await sql`
    SELECT o.*, u.name AS member_name, s.name AS sent_by_name
    FROM outreach_log o JOIN users u ON u.id = o.user_id LEFT JOIN users s ON s.id = o.sent_by
    ORDER BY o.created_at DESC LIMIT ${limit}
  `;
  return rows.map((r: any) => ({
    id: r.id,
    member: { id: r.user_id, name: r.member_name },
    campaign: r.campaign,
    channel: r.channel,
    note: r.note,
    sent_by_name: r.sent_by_name,
    created_at: iso(r.created_at)!,
  }));
}
