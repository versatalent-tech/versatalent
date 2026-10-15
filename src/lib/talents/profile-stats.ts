/**
 * The figures in a talent's profile hero. No imports: shared by the API,
 * the public page and the admin editor.
 *
 * Each figure is counted from the records (only work that has finished)
 * plus any earlier work the admin adds, and the admin can hide it. A figure
 * of 0 isn't shown on the public page.
 */

export const PROFILE_STATS = [
  {
    key: 'jobs',
    singular: 'Job completed',
    plural: 'Jobs completed',
    definition: 'Confirmed or completed bookings that have finished (bookings for an event count as events)',
  },
  {
    key: 'events',
    singular: 'Event',
    plural: 'Events',
    definition: 'Events they were added to, or booked for, that have taken place (cancelled events excluded)',
  },
  {
    key: 'clients',
    singular: 'Client',
    plural: 'Clients',
    definition: 'Different clients across their finished bookings',
  },
] as const;

export type ProfileStatKey = (typeof PROFILE_STATS)[number]['key'];
export const PROFILE_STAT_KEYS = PROFILE_STATS.map((s) => s.key) as ProfileStatKey[];

/** Admin settings for one figure */
export interface ProfileStatSetting {
  extra: number;
  hidden: boolean;
}

/** What the admin editor shows for one figure */
export interface ProfileStatDetail extends ProfileStatSetting {
  counted: number;
  total: number;
}

export type ProfileStatDetails = Record<ProfileStatKey, ProfileStatDetail>;

/** What the public page gets: visible figures above 0, in order */
export interface PublicProfileStat {
  key: ProfileStatKey;
  value: number;
  label: string;
}

export const MAX_EXTRA = 100_000;

export function statLabel(key: ProfileStatKey, value: number): string {
  const def = PROFILE_STATS.find((s) => s.key === key)!;
  return value === 1 ? def.singular : def.plural;
}

/** Read the stored jsonb safely, whatever shape it's in */
export function readSettings(raw: unknown): Record<ProfileStatKey, ProfileStatSetting> {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const out = {} as Record<ProfileStatKey, ProfileStatSetting>;
  for (const key of PROFILE_STAT_KEYS) {
    const extra = Number(obj[key]?.extra);
    out[key] = {
      extra: Number.isInteger(extra) && extra > 0 ? Math.min(extra, MAX_EXTRA) : 0,
      hidden: obj[key]?.hidden === true,
    };
  }
  return out;
}

export function publicStats(details: ProfileStatDetails): PublicProfileStat[] {
  return PROFILE_STAT_KEYS.filter((key) => !details[key].hidden && details[key].total > 0).map((key) => ({
    key,
    value: details[key].total,
    label: statLabel(key, details[key].total),
  }));
}
