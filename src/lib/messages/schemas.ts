import { z } from 'zod';
import { STAGE_KEYS } from './types';

export const templateSchema = z.object({
  stage: z.enum(STAGE_KEYS),
  name: z.string().trim().min(1, 'Give the template a name').max(100),
  subject: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  body: z.string().trim().min(1, 'Write the message').max(5000),
  is_default: z.boolean().optional(),
});
