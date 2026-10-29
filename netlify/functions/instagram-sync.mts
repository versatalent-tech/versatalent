/**
 * Scheduled function: starts the nightly Instagram sync. Scheduled functions
 * only get 30 seconds, so the work happens in instagram-sync-background.mts.
 */
import { instagramSyncToken } from '../../src/lib/instagram/sync';

export default async () => {
  if (!process.env.INSTAGRAM_APP_SECRET || !process.env.URL) return;
  const response = await fetch(`${process.env.URL}/.netlify/functions/instagram-sync-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: instagramSyncToken() }),
  });
  console.log(`[instagram-sync] Started the nightly sync: ${response.status}`);
};

export const config = { schedule: '@daily' };
