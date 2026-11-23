import { z } from 'zod';
import { isPushEndpoint } from './push';

/** What a browser sends to switch push on or off (portal and team) */
const endpoint = z.string().max(1000).refine(isPushEndpoint, 'This browser’s push service isn’t supported');
export const pushSaveSchema = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export const pushDeleteSchema = z.object({ endpoint });
