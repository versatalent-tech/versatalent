import { z } from 'zod';
import { OUTCOMES, PROSPECT_CHANNEL_KEYS } from './types';

/** Request-body validation for the prospecting API */

const uuid = z.string().uuid();

export const stepSchema = z.object({
  position: z.number().int().min(1).max(20),
  delay_days: z.number().int().min(0).max(365),
  channel: z.enum(PROSPECT_CHANNEL_KEYS),
  subject: z.string().trim().max(300).nullable().optional().transform((v) => v || null),
  body: z.string().trim().min(1, 'Each step needs a message').max(5000),
});

export const stepsSchema = z.object({
  steps: z.array(stepSchema).min(1, 'Add at least one step').max(20),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200),
  goal: z.string().trim().max(1000).nullable().optional().transform((v) => v || null),
  talent_ids: z.array(uuid).max(20).default([]),
  owner_user_id: uuid.nullable().optional(),
});

export const campaignUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  goal: z.string().trim().max(1000).nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
  talent_ids: z.array(uuid).max(20).optional(),
  owner_user_id: uuid.nullable().optional(),
  status: z.enum(['draft', 'active', 'paused', 'done']).optional(),
});

export const enrolSchema = z.object({
  contact_ids: z.array(uuid).min(1, 'Choose at least one contact').max(300),
});

export const enrolmentActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('step'),
    step: z.number().int().min(1),
    outcome: z.enum(['sent', 'skipped']),
    message: z.string().max(10000).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  }),
  z.object({
    action: z.literal('outcome'),
    outcome: z.enum(OUTCOMES),
    note: z.string().trim().max(2000).nullable().optional(),
  }),
  z.object({ action: z.literal('deal') }),
  z.object({ action: z.literal('remove') }),
]);
