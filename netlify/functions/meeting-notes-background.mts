/**
 * Background function: drafts a meeting's notes with Claude.
 *
 * Started by POST /api/crm/meetings/[id]/notes, which gets an immediate 202
 * and polls the meeting for the result. Background functions may run for 15
 * minutes; normal requests time out long before a long transcript is done.
 *
 * Anyone can call this URL, so it only acts when given the meeting's current
 * one-off job token (see runMeetingNotesJob).
 */
import { runMeetingNotesJob } from '../../src/lib/meetings/ai-notes';

export default async (request: Request) => {
  const body = await request.json().catch(() => null);
  const meetingId = typeof body?.meetingId === 'string' ? body.meetingId : '';
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!/^[0-9a-f-]{36}$/i.test(meetingId) || !/^[0-9a-f]{48}$/.test(token)) return;

  await runMeetingNotesJob(meetingId, token);
};

export const config = { background: true };
