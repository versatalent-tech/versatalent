import { z } from 'zod';

/** Request-body validation for the admin Instagram API */

export const addPostSchema = z.object({
  url: z.string().trim().min(1, 'Paste the link to an Instagram post or reel').max(500),
  /** null = VersaTalent's own account */
  talent_id: z.string().uuid().nullable(),
  on_homepage: z.boolean().default(true),
});

export const updatePostSchema = z
  .object({
    talent_id: z.string().uuid().nullable().optional(),
    on_homepage: z.boolean().optional(),
    is_visible: z.boolean().optional(),
    /** Swap with the post above or below it on the same talent */
    move: z.enum(['up', 'down']).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), 'Nothing to change');
