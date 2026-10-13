import { z } from 'zod';
import { CRM_CURRENCIES, DEAL_SOURCES, DEAL_STAGE_KEYS, LOGGABLE_ACTIVITY_TYPES, MAX_TRANSCRIPT_CHARS, ORG_TYPES } from './types';

/** Request-body validation for the CRM API */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const uuid = z.string().uuid();
const keys = <T extends Record<string, unknown>>(obj: T) => Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];

export const organisationSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200),
  type: z.enum(keys(ORG_TYPES)).default('other'),
  website: optionalText(300),
  email: z.string().trim().email('Enter a valid email').max(200).nullable().optional().or(z.literal('').transform(() => null)),
  phone: optionalText(50),
  city: optionalText(100),
  country: optionalText(100),
  notes: optionalText(5000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  owner_user_id: uuid.nullable().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200),
  organisation_id: uuid.nullable().optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200).nullable().optional().or(z.literal('').transform(() => null)),
  phone: optionalText(50),
  job_title: optionalText(100),
  lawful_basis: z.enum(['legitimate_interest', 'consent']).default('legitimate_interest'),
  do_not_contact: z.boolean().default(false),
  notes: optionalText(5000),
});

export const dealSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(200),
  organisation_id: uuid.nullable().optional(),
  contact_id: uuid.nullable().optional(),
  stage: z.enum(DEAL_STAGE_KEYS).default('lead'),
  value_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.enum(CRM_CURRENCIES).default('GBP'),
  expected_close: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  source: z.enum(keys(DEAL_SOURCES)).default('other'),
  talent_ids: z.array(uuid).max(50).default([]),
  lost_reason: optionalText(500),
  notes: optionalText(5000),
  owner_user_id: uuid.nullable().optional(),
});

export const activitySchema = z
  .object({
    type: z.enum(keys(LOGGABLE_ACTIVITY_TYPES)),
    subject: z.string().trim().min(1, 'Enter a subject').max(300),
    body: optionalText(10000),
    deal_id: uuid.nullable().optional(),
    organisation_id: uuid.nullable().optional(),
    contact_id: uuid.nullable().optional(),
    due_at: z.string().datetime({ offset: true }).nullable().optional(),
    owner_user_id: uuid.nullable().optional(),
  })
  .refine((a) => a.deal_id || a.organisation_id || a.contact_id || a.type === 'task', {
    message: 'Attach this to a deal, client or contact',
  })
  .refine((a) => a.type !== 'task' || a.due_at, { message: 'Tasks need a due date', path: ['due_at'] });

export const activityUpdateSchema = z.object({
  completed: z.boolean().optional(),
  subject: z.string().trim().min(1).max(300).optional(),
  body: optionalText(10000),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
  owner_user_id: uuid.nullable().optional(),
});

export const enquiryConvertSchema = z.object({
  title: z.string().trim().min(1, 'Enter a deal title').max(200),
  organisation_name: optionalText(200),
  organisation_type: z.enum(keys(ORG_TYPES)).default('brand'),
  talent_ids: z.array(uuid).max(50).default([]),
  value_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  owner_user_id: uuid.nullable().optional(),
});

const isoDateTime = z.string().datetime({ offset: true });
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

export const meetingSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title').max(200),
    starts_at: isoDateTime,
    ends_at: isoDateTime.nullable().optional(),
    location: optionalText(300),
    deal_id: uuid.nullable().optional(),
    organisation_id: uuid.nullable().optional(),
    talent_ids: z.array(uuid).max(50).default([]),
    attendees: optionalText(2000),
  })
  .refine((m) => !m.ends_at || new Date(m.ends_at) >= new Date(m.starts_at), {
    message: 'The meeting must end after it starts',
    path: ['ends_at'],
  });

export const meetingActionItemSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1, 'Action items need a description').max(500),
  owner_name: optionalText(200),
  owner_user_id: uuid.nullable().optional(),
  due_date: dateOnly.nullable().optional().or(z.literal('').transform(() => null)),
});

/** Transcript, or the reviewed notes; each part is optional */
export const meetingNotesSchema = z
  .object({
    transcript: z.string().max(MAX_TRANSCRIPT_CHARS, 'This transcript is too long. Split the meeting into parts.').nullable().optional(),
    recording_consent: z.boolean().optional(),
    summary: optionalText(10000),
    decisions: z.array(z.string().trim().min(1).max(1000)).max(50).optional(),
    action_items: z.array(meetingActionItemSchema).max(50).optional(),
  })
  .refine((n) => !n.transcript || n.recording_consent === true, {
    message: 'Confirm that everyone in the meeting was told it was recorded',
    path: ['recording_consent'],
  });

export const meetingTasksSchema = z.object({
  item_ids: z.array(z.string().min(1).max(40)).min(1, 'Choose at least one action item').max(50),
});

/** Public website form submission */
export const publicEnquirySchema = z.object({
  form: z.enum(['contact', 'brand', 'talent', 'booking']),
  fields: z.record(z.string().max(100), z.string().max(5000)),
});

/** First validation message, for showing to the person */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? 'Invalid request';
}
