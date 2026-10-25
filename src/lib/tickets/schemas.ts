import { z } from 'zod';
import { AGE_RANGES, HEARD_FROM, normaliseInstagram } from './types';

const keys = <T extends Record<string, unknown>>(obj: T) => Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

/** Public: buying tickets */
export const ticketOrderSchema = z.object({
  event_id: z.string().uuid(),
  items: z
    .array(z.object({ ticket_type_id: z.string().uuid(), quantity: z.number().int().min(0).max(50) }))
    .max(20)
    .transform((items) => items.filter((i) => i.quantity > 0))
    .refine((items) => items.length > 0, 'Choose at least one ticket')
    .refine((items) => new Set(items.map((i) => i.ticket_type_id)).size === items.length, 'Choose each ticket once'),
  first_name: z.string().trim().min(1, 'Enter your first name').max(80),
  last_name: z.string().trim().min(1, 'Enter your last name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === '' || /^[+()\d\s-]{7,30}$/.test(v), 'Enter a valid phone number')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  instagram: z
    .string()
    .trim()
    .min(1, 'Enter your Instagram username')
    .max(200)
    .transform((v, ctx) => {
      const handle = normaliseInstagram(v);
      if (!handle) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter your Instagram username, e.g. @yourname' });
        return z.NEVER;
      }
      return handle;
    }),
  city: optionalText(80),
  age_range: z.enum(AGE_RANGES).nullable().optional().or(z.literal('').transform(() => null)),
  heard_from: z.enum(keys(HEARD_FROM)).nullable().optional().or(z.literal('').transform(() => null)),
  marketing_consent: z.boolean().default(false),
  accept_terms: z.literal(true, { error: 'Please accept the ticket terms to continue' }),
  source: z.enum(['website', 'card_tap', 'member_pass']).default('website'),
  utm_source: optionalText(100),
  utm_medium: optionalText(100),
  utm_campaign: optionalText(100),
  referrer: optionalText(300),
});

const dateTime = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

/** Admin: a ticket type */
export const ticketTypeSchema = z
  .object({
    event_id: z.string().uuid(),
    name: z.string().trim().min(1, 'Name the ticket, e.g. "General admission"').max(80),
    description: optionalText(300),
    price_cents: z.number().int().min(0, 'The price can’t be negative').max(1_000_000),
    capacity: z.number().int().min(0).max(100_000).nullable().optional(),
    max_per_order: z.number().int().min(1).max(50).default(6),
    sales_start: dateTime,
    sales_end: dateTime,
    is_active: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(1000).default(0),
  })
  .refine((t) => !t.sales_start || !t.sales_end || new Date(t.sales_end) > new Date(t.sales_start), {
    message: 'Sales must end after they start',
    path: ['sales_end'],
  });

/** Admin: refund or tick off at the door */
export const ticketOrderActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('refund'), reason: optionalText(300) }),
  z.object({ action: z.literal('arrived'), arrived: z.boolean() }),
]);
