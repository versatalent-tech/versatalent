import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));
const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().optional().transform((v) => (v === undefined ? null : v));
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : null));

/** Admin: a reward */
export const rewardSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the reward a title').max(120),
    description: optionalText(500),
    kind: z.enum(['drink', 'upgrade', 'guest_pass', 'other']).default('other'),
    point_cost: z.number().int().min(0).max(1_000_000),
    unit_cost_cents: optionalInt(0, 1_000_000),
    stock: optionalInt(0, 1_000_000),
    per_member_limit: optionalInt(1, 1000),
    limit_period: z.enum(['ever', 'year']).default('ever'),
    requires_event: z.boolean().default(false),
    event_ids: z.array(z.string().uuid()).max(200).nullable().optional().transform((v) => (v && v.length ? v : null)),
    per_event_cap: optionalInt(1, 100_000),
    book_hours_before: z.number().int().min(0).max(24 * 60).default(0),
    needs_guest_name: z.boolean().default(false),
    min_tier: z.enum(['silver', 'gold', 'black']).nullable().optional().transform((v) => v ?? null),
    founding_only: z.boolean().default(false),
    birthday_month_only: z.boolean().default(false),
    claim_valid_days: z.number().int().min(1).max(3650).default(30),
    valid_from: optionalDate,
    valid_until: optionalDate,
    is_active: z.boolean().default(false),
    sort_order: z.number().int().min(0).max(10_000).default(0),
  })
  .refine((r) => !r.valid_from || !r.valid_until || r.valid_from <= r.valid_until, {
    message: 'The end date is before the start date',
    path: ['valid_until'],
  });

/** Member or staff: claim a reward */
export const claimSchema = z.object({
  reward_id: z.string().uuid(),
  event_id: z.string().uuid().nullable().optional(),
  guest_name: z.string().trim().max(100).nullable().optional(),
});
