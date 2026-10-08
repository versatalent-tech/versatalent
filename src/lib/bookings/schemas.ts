import { z } from 'zod';
import { CRM_CURRENCIES } from '@/lib/crm/types';
import { AVAILABILITY_KINDS, BOOKING_STATUSES } from './types';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime({ offset: true });
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const percent = z.number().min(0).max(100);
const keys = <T extends Record<string, unknown>>(obj: T) => Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];

const bookingFields = z.object({
  talent_id: uuid,
  deal_id: uuid.nullable().optional(),
  organisation_id: uuid.nullable().optional(),
  title: z.string().trim().min(1, 'Enter a title').max(200),
  status: z.enum(keys(BOOKING_STATUSES)).default('hold'),
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  location: optionalText(300),
  call_time: optionalText(100),
  brief: optionalText(5000),
  logistics_notes: optionalText(5000),
  onsite_contact: z
    .object({ name: z.string().trim().max(100).optional(), phone: z.string().trim().max(50).optional() })
    .optional(),
  fee_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.enum(CRM_CURRENCIES).default('GBP'),
  commission_percent: percent.nullable().optional(),
  client_visible_to_talent: z.boolean().default(false),
  shared_with_talent: z.boolean().default(true),
  /** Save even though it clashes with another booking or unavailability */
  force: z.boolean().optional(),
});

const endsAfterStart = (b: { starts_at?: string; ends_at?: string }) =>
  !b.starts_at || !b.ends_at || new Date(b.ends_at) > new Date(b.starts_at);
const endsMessage = { message: 'The end must be after the start', path: ['ends_at'] };

export const bookingSchema = bookingFields.refine(endsAfterStart, endsMessage);
export const bookingUpdateSchema = bookingFields.partial().refine(endsAfterStart, endsMessage);

/** What a road manager may change */
export const LOGISTICS_FIELDS = ['call_time', 'logistics_notes'] as const;

export const availabilitySchema = z
  .object({
    talent_id: uuid,
    starts_on: day,
    ends_on: day,
    kind: z.enum(keys(AVAILABILITY_KINDS)).default('unavailable'),
    note: optionalText(300),
  })
  .refine((a) => a.ends_on >= a.starts_on, { message: 'The last day must be on or after the first', path: ['ends_on'] });

export const ratesSchema = z.object({
  rates: z.array(z.object({ talent_id: uuid, commission_percent: percent.nullable() })).max(200),
});
