/**
 * Outreach queue: who to contact and what to say. Messages are sent by
 * hand (no email provider yet) and marked sent in the admin. No server
 * imports: bundled into client components.
 */

export const CAMPAIGN_KEYS = ['welcome', 'post_event', 'inactive', 'near_tier', 'founding_renewal', 'founding_lapsed'] as const;
export type CampaignKey = (typeof CAMPAIGN_KEYS)[number];

export interface CampaignDefinition {
  key: CampaignKey;
  title: string;
  /** Who appears in the list */
  rule: string;
  /**
   * Marketing messages need the member's email or SMS consent. Service
   * messages about something they paid for (renewal) don't.
   */
  needs_consent: boolean;
  /** One message per thing (e.g. per event) rather than a cooldown */
  one_off: boolean;
  default_cooldown_days: number;
  default_subject: string;
  default_body: string;
}

export const CAMPAIGNS: Record<CampaignKey, CampaignDefinition> = {
  welcome: {
    key: 'welcome',
    title: 'Welcome',
    rule: 'Joined in the last 14 days',
    needs_consent: true,
    one_off: true,
    default_cooldown_days: 0,
    default_subject: 'Welcome to VersaTalent VIP',
    default_body:
      "Hi {first_name},\n\nWelcome to VersaTalent VIP! Tap your card at the door of our next event to start collecting points.\n\nYour member pass: {pass_link}\n\nSee you soon,\nVersaTalent",
  },
  post_event: {
    key: 'post_event',
    title: 'After an event',
    rule: 'Checked in at an event in the last 3 days',
    needs_consent: true,
    one_off: true,
    default_cooldown_days: 0,
    default_subject: 'Thanks for coming to {event}',
    default_body:
      "Hi {first_name},\n\nThanks for coming to {event}! You now have {points} reward points to spend.\n\nYour member pass: {pass_link}\n\nVersaTalent",
  },
  inactive: {
    key: 'inactive',
    title: 'Inactive',
    rule: 'No check-in for 60 days',
    needs_consent: true,
    one_off: false,
    default_cooldown_days: 60,
    default_subject: 'We miss you at VersaTalent',
    default_body:
      "Hi {first_name},\n\nIt's been a while! You have {points} reward points waiting. Here's what's coming up: {events_link}\n\nVersaTalent",
  },
  near_tier: {
    key: 'near_tier',
    title: 'Close to the next tier',
    rule: 'Within 25% of the next tier this membership year',
    needs_consent: true,
    one_off: false,
    default_cooldown_days: 30,
    default_subject: "You're close to {next_tier}",
    default_body:
      "Hi {first_name},\n\nYou're only {points_to_next} status points away from {next_tier}. Come to our next event to get there: {events_link}\n\nVersaTalent",
  },
  founding_renewal: {
    key: 'founding_renewal',
    title: 'Founding renewal due',
    rule: 'Founding Membership ends within 30 days and not renewed',
    needs_consent: false,
    one_off: true,
    default_cooldown_days: 0,
    default_subject: 'Your V•PRIVILEGE Founding Membership ends on {ends_on}',
    default_body:
      "Hi {first_name},\n\nYour V•PRIVILEGE Founding Membership (No. {founding_number}) ends on {ends_on}. It doesn't renew automatically.\n\nTo keep your benefits for another year, renew from your member pass: {pass_link}\n\nVersaTalent",
  },
  founding_lapsed: {
    key: 'founding_lapsed',
    title: 'Founding lapsed',
    rule: 'Founding Membership ended in the last 60 days and not renewed',
    needs_consent: true,
    one_off: true,
    default_cooldown_days: 0,
    default_subject: 'Come back to V•PRIVILEGE',
    default_body:
      "Hi {first_name},\n\nYour V•PRIVILEGE Founding Membership ended on {ends_on}. You keep your founding number (No. {founding_number}) if you rejoin: {pass_link}\n\nVersaTalent",
  },
};

export interface CampaignSettings {
  enabled: boolean;
  cooldown_days: number;
  subject: string;
  body: string;
}

export type CampaignSettingsMap = Record<CampaignKey, CampaignSettings>;

export function defaultCampaignSettings(): CampaignSettingsMap {
  return Object.fromEntries(
    CAMPAIGN_KEYS.map((key) => [
      key,
      { enabled: true, cooldown_days: CAMPAIGNS[key].default_cooldown_days, subject: CAMPAIGNS[key].default_subject, body: CAMPAIGNS[key].default_body },
    ])
  ) as CampaignSettingsMap;
}

export const CHANNELS = {
  email: 'Email',
  sms: 'Text',
  whatsapp: 'WhatsApp',
  phone: 'Phone call',
  in_person: 'In person',
  other: 'Other',
  skipped: 'Skipped (not contacted)',
} as const;
export type Channel = keyof typeof CHANNELS;

export interface OutreachCandidate {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  /** Why they're on the list, e.g. "Checked in at X on 3 Oct" */
  detail: string;
  dedupe_key: string | null;
  last_contacted_at: string | null;
  values: Record<string, string>;
}

export interface OutreachLogEntry {
  id: string;
  member: { id: string; name: string };
  campaign: CampaignKey;
  channel: Channel;
  note: string | null;
  sent_by_name: string | null;
  created_at: string;
}

/** Fill {placeholders}; unknown ones are left as they are */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

export const PLACEHOLDERS = [
  'first_name',
  'pass_link',
  'events_link',
  'points',
  'tier',
  'next_tier',
  'points_to_next',
  'event',
  'ends_on',
  'founding_number',
  'referral_link',
];
