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
