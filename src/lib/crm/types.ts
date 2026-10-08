/**
 * CRM constants and shapes shared by the API and the admin pages.
 * No server imports here: this file is bundled into client components.
 */

export const DEAL_STAGES = [
  { key: 'lead', label: 'Lead', probability: 0.1 },
  { key: 'qualified', label: 'Qualified', probability: 0.25 },
  { key: 'proposal', label: 'Proposal sent', probability: 0.5 },
  { key: 'negotiation', label: 'Negotiation', probability: 0.75 },
  { key: 'won', label: 'Won', probability: 1 },
  { key: 'lost', label: 'Lost', probability: 0 },
] as const;
export type DealStage = (typeof DEAL_STAGES)[number]['key'];
export const DEAL_STAGE_KEYS = DEAL_STAGES.map((s) => s.key) as [DealStage, ...DealStage[]];
export const OPEN_STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation'];
export const STAGE_LABELS = Object.fromEntries(DEAL_STAGES.map((s) => [s.key, s.label])) as Record<DealStage, string>;
export const STAGE_PROBABILITY = Object.fromEntries(DEAL_STAGES.map((s) => [s.key, s.probability])) as Record<
  DealStage,
  number
>;

export const DEAL_SOURCES = {
  website_form: 'Website form',
  referral: 'Referral',
  outreach: 'Outreach',
  inbound_email: 'Email',
  instagram: 'Instagram',
  phone: 'Phone',
  event: 'At an event',
  other: 'Other',
} as const;
export type DealSource = keyof typeof DEAL_SOURCES;

export const ORG_TYPES = {
  brand: 'Brand',
  agency: 'Agency',
  venue: 'Venue',
  promoter: 'Promoter',
  production: 'Production company',
  private: 'Private client',
  other: 'Other',
} as const;
export type OrgType = keyof typeof ORG_TYPES;

/** Activity types a person can log by hand */
export const LOGGABLE_ACTIVITY_TYPES = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
} as const;
export type ActivityType = keyof typeof LOGGABLE_ACTIVITY_TYPES | 'stage_change' | 'system';

export const CRM_CURRENCIES = ['GBP', 'EUR', 'USD'] as const;

export const ENQUIRY_FORMS = { contact: 'Contact form', brand: 'Brand partnership', talent: 'Talent application' } as const;
export type EnquiryForm = keyof typeof ENQUIRY_FORMS;
export type EnquiryStatus = 'new' | 'converted' | 'archived' | 'spam';

/** Hidden form field that people never see but bots fill in (also Netlify's honeypot) */
export const HONEYPOT_FIELD = 'bot-field';

/** A deal with no activity or stage change for this long is flagged as stale */
export const STALE_DEAL_DAYS = 14;

export interface PersonRef {
  id: string;
  name: string;
}

export interface Organisation {
  id: string;
  name: string;
  type: OrgType;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  tags: string[];
  owner: PersonRef | null;
  open_deals: number;
  contacts_count: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  lawful_basis: 'legitimate_interest' | 'consent';
  do_not_contact: boolean;
  notes: string | null;
  organisation: PersonRef | null;
  created_at: string;
}

export interface Deal {
  id: string;
  title: string;
  stage: DealStage;
  value_cents: number | null;
  currency: string;
  expected_close: string | null;
  source: DealSource;
  lost_reason: string | null;
  notes: string | null;
  organisation: PersonRef | null;
  contact: (PersonRef & { email: string | null; phone: string | null }) | null;
  owner: PersonRef | null;
  talents: PersonRef[];
  stage_changed_at: string;
  closed_at: string | null;
  last_activity_at: string | null;
  next_task: { subject: string; due_at: string } | null;
  created_at: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  due_at: string | null;
  completed_at: string | null;
  owner: PersonRef | null;
  created_by: string | null; // user id of whoever logged it
  created_by_name: string | null;
  deal: PersonRef | null; // name = deal title
  organisation: PersonRef | null;
  contact: PersonRef | null;
  created_at: string;
}

export interface Enquiry {
  id: string;
  form: EnquiryForm;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string | null;
  payload: Record<string, string>;
  status: EnquiryStatus;
  deal: PersonRef | null;
  handled_by_name: string | null;
  handled_at: string | null;
  created_at: string;
}

export interface CrmOptions {
  owners: PersonRef[];
  talents: PersonRef[];
}

export function weightedValue(deal: Pick<Deal, 'stage' | 'value_cents'>): number {
  return Math.round((deal.value_cents ?? 0) * STAGE_PROBABILITY[deal.stage]);
}
