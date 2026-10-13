/**
 * Prospecting campaigns (CRM outreach v1): shapes, labels and message
 * helpers. Task-driven: the system lists what's due and fills in the
 * message; people send it themselves and record the result.
 * No server imports: bundled into client components.
 */
import type { PersonRef } from '@/lib/crm/types';

export const PROSPECT_CHANNELS = {
  email: 'Email',
  linkedin: 'LinkedIn',
  call: 'Call',
  instagram: 'Instagram DM',
} as const;
export type ProspectChannel = keyof typeof PROSPECT_CHANNELS;
export const PROSPECT_CHANNEL_KEYS = Object.keys(PROSPECT_CHANNELS) as [ProspectChannel, ...ProspectChannel[]];

export const CAMPAIGN_STATUSES = { draft: 'Draft', active: 'Active', paused: 'Paused', done: 'Finished' } as const;
export type CampaignStatus = keyof typeof CAMPAIGN_STATUSES;

export const ENROLMENT_STATUSES = {
  active: 'In sequence',
  replied: 'Replied',
  meeting: 'Meeting booked',
  not_interested: 'Not interested',
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
  completed: 'Sequence finished',
  stopped: 'Stopped',
} as const;
export type EnrolmentStatus = keyof typeof ENROLMENT_STATUSES;

/** Results a person can record; each ends the sequence for that contact */
export const OUTCOMES = ['replied', 'meeting', 'not_interested', 'bounced', 'unsubscribed'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Results that count as a positive reply (reply rate KPI) */
export const POSITIVE_OUTCOMES: EnrolmentStatus[] = ['replied', 'meeting'];

/** Added to every email, so each one has a way out (PECR) */
export const EMAIL_OPT_OUT = "If you'd rather not hear from VersaTalent, just reply \"unsubscribe\" and we'll take you off our list.";

export const PROSPECT_PLACEHOLDERS = ['first_name', 'name', 'company', 'talents', 'talent_links', 'sender'];

export interface ProspectStep {
  id?: string;
  position: number;
  delay_days: number;
  channel: ProspectChannel;
  subject: string | null;
  body: string;
}

export interface CampaignStats {
  enrolled: number;
  active: number;
  contacted: number;
  replied: number; // replied + meeting
  meetings: number;
  not_interested: number;
  due_now: number;
}

export interface Campaign {
  id: string;
  name: string;
  goal: string | null;
  status: CampaignStatus;
  talents: PersonRef[];
  owner: PersonRef | null;
  created_by: string | null;
  created_by_name: string | null;
  activated_at: string | null;
  created_at: string;
  stats: CampaignStats;
}

export interface CampaignDetail extends Campaign {
  steps: ProspectStep[];
  enrolments: Enrolment[];
}

export interface Enrolment {
  id: string;
  contact: PersonRef & { email: string | null };
  organisation: PersonRef | null;
  owner: PersonRef | null;
  next_step: number;
  next_due_at: string | null;
  status: EnrolmentStatus;
  status_changed_at: string;
  first_contacted_at: string | null;
  deal: PersonRef | null;
}

/** A step due for one contact, with everything needed to send it */
export interface DueItem {
  enrolment_id: string;
  campaign: { id: string; name: string };
  step: ProspectStep;
  total_steps: number;
  due_at: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    linkedin_url: string | null;
    instagram: string | null;
    is_sole_trader: boolean;
    lawful_basis: 'legitimate_interest' | 'consent';
  };
  organisation: PersonRef | null;
  talents: { id: string; name: string }[];
  owner: PersonRef | null;
}

/** A contact that could be enrolled, with what might stop it */
export interface ProspectCandidate {
  id: string;
  name: string;
  email: string | null;
  job_title: string | null;
  organisation: (PersonRef & { type: string; city: string | null; tags: string[] }) | null;
  do_not_contact: boolean;
  is_sole_trader: boolean;
  lawful_basis: 'legitimate_interest' | 'consent';
  already_enrolled: boolean;
}

/** Email can't go to an individual (sole trader) without their consent */
export function emailBlocked(contact: { is_sole_trader: boolean; lawful_basis: string }): boolean {
  return contact.is_sole_trader && contact.lawful_basis !== 'consent';
}

/** Fill {placeholders}; unknown ones are left as they are */
export function fillMessage(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

/** The message for a due step, with the opt-out line on emails */
export function buildMessage(item: DueItem, sender: string, siteUrl: string): { subject: string; body: string } {
  const values: Record<string, string> = {
    first_name: item.contact.name.split(' ')[0],
    name: item.contact.name,
    company: item.organisation?.name ?? 'your team',
    talents: item.talents.map((t) => t.name).join(', ') || 'our talent',
    talent_links: item.talents.map((t) => `${t.name}: ${siteUrl}/talents/${t.id}`).join('\n'),
    sender,
  };
  const body = fillMessage(item.step.body, values);
  return {
    subject: fillMessage(item.step.subject ?? '', values),
    body: item.step.channel === 'email' && !body.includes(EMAIL_OPT_OUT) ? `${body}\n\n${EMAIL_OPT_OUT}` : body,
  };
}

/** A starting sequence for a new campaign */
export const STARTER_STEPS: ProspectStep[] = [
  {
    position: 1,
    delay_days: 0,
    channel: 'email',
    subject: 'Talent for {company}',
    body:
      "Hi {first_name},\n\nI'm {sender} from VersaTalent, a talent agency in Yorkshire. We represent {talents}, and I think they'd be a great fit for {company}.\n\n{talent_links}\n\nWould you be open to a quick call next week?\n\nBest,\n{sender}",
  },
  {
    position: 2,
    delay_days: 4,
    channel: 'linkedin',
    subject: null,
    body: "Hi {first_name}, I sent you an email about {talents} for {company}. Happy to share more if it's useful. {sender}",
  },
  {
    position: 3,
    delay_days: 7,
    channel: 'email',
    subject: 'Re: Talent for {company}',
    body: "Hi {first_name},\n\nJust following up on my last note. If the timing isn't right, no problem at all.\n\nBest,\n{sender}",
  },
];
