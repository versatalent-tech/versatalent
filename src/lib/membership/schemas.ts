import { z } from 'zod';
import { INTERESTS, REFERRAL_SOURCES } from '@/lib/vip-profile';
import { MIN_AGE, ageOn, normaliseUkPostcode } from './types';

const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max);

/** Public membership application */
export const applicationSchema = z
  .object({
    first_name: text(1, 60, 'Enter your first name'),
    last_name: text(1, 60, 'Enter your last name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number'),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth'),
    address_line1: text(1, 100, 'Enter the first line of your address'),
    address_line2: z.string().trim().max(100).optional().default(''),
    city: text(1, 60, 'Enter your town or city'),
    postcode: z.string().trim().max(10),
    interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).default([]),
    referral_source: z.enum(REFERRAL_SOURCES).nullable().optional(),
    consent_email: z.boolean().default(false),
    consent_sms: z.boolean().default(false),
    consent_post: z.boolean().default(false),
    founding_interest: z.boolean().default(false),
    /** free: pay card delivery; founding: buy the Founding Membership (delivery included) */
    plan: z.enum(['free', 'founding']).default('free'),
    accept_terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the membership terms' }) }),
  })
  .superRefine((data, ctx) => {
    const age = ageOn(data.date_of_birth);
    if (Number.isNaN(age) || age > 110) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date_of_birth'], message: 'Enter a valid date of birth' });
    } else if (age < MIN_AGE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date_of_birth'], message: `Membership is for people aged ${MIN_AGE} and over` });
    }
    if (!normaliseUkPostcode(data.postcode)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['postcode'], message: 'Enter a valid UK postcode (we post cards within the UK)' });
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

/** Admin: a Founding Membership benefit */
export const benefitSchema = z.object({
  title: text(1, 120, 'Give the benefit a title'),
  description: optionalText(500),
  limit_text: optionalText(300),
  eligibility_text: optionalText(300),
  owner: optionalText(100),
  unit_cost_cents: z.number().int().min(0).max(1_000_000).nullable().optional().transform((v) => v ?? null),
  status: z.enum(['active', 'paused', 'retired']).default('active'),
  sort_order: z.number().int().min(0).max(10_000).default(0),
});

/** Admin: record a Founding Membership paid in person */
export const inPersonSaleSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    card_uid: z.string().trim().max(40).optional(),
    method: z.enum(['sumup_reader', 'sumup_app', 'cash']),
    reference: optionalText(100),
    price_cents: z.number().int().min(0).max(100_000),
  })
  .refine((d) => d.email || d.card_uid, { message: 'Enter the member’s email or card UID', path: ['email'] });
