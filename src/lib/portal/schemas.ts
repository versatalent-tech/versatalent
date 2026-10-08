import { z } from 'zod';
import { EDITABLE_SOCIALS } from './types';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const tier = z.enum(['silver', 'gold', 'black']);

export const respondSchema = z.object({
  response: z.enum(['accepted', 'declined']),
  note: optionalText(500),
});

export const portalAvailabilitySchema = z
  .object({
    starts_on: day,
    ends_on: day,
    kind: z.enum(['unavailable', 'tentative']).default('unavailable'),
    note: optionalText(300),
  })
  .refine((a) => a.ends_on >= a.starts_on, { message: 'The last day must be on or after the first', path: ['ends_on'] });

const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Links must start with http:// or https://');

export const profileChangeSchema = z.object({
  changes: z
    .object({
      tagline: z.string().trim().max(200).optional(),
      bio: z.string().trim().max(5000).optional(),
      location: z.string().trim().max(100).optional(),
      skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      social_links: z.object(Object.fromEntries(EDITABLE_SOCIALS.map((k) => [k, url.optional()]))).partial().optional(),
    })
    .refine((c) => Object.keys(c).length > 0, 'Change at least one thing'),
  note: optionalText(500),
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password'),
  new_password: z.string().min(8),
});

export const perkSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title').max(150),
    description: optionalText(1000),
    talent_id: z.string().uuid().nullable().optional(),
    min_tier: tier.nullable().optional(),
    valid_from: day.nullable().optional().or(z.literal('').transform(() => null)),
    valid_until: day.nullable().optional().or(z.literal('').transform(() => null)),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(1000).default(0),
  })
  .refine((p) => !p.valid_from || !p.valid_until || p.valid_until >= p.valid_from, {
    message: 'The end date must be after the start date',
    path: ['valid_until'],
  });

export const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: optionalText(500),
});

export const createTalentLoginSchema = z.object({
  talent_id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
