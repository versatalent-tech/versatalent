import { NextRequest } from 'next/server';
import { crmContext } from '@/lib/crm/route-helpers';
import { MEETING_AI_STALE_MINUTES } from '@/lib/crm/types';
import { failMeetingNotesStart, getMeeting, requestMeetingNotes } from '@/lib/db/repositories/meetings';
import { runMeetingNotesJob } from '@/lib/meetings/ai-notes';
import { aiNotesEnabled } from '@/lib/meetings/ai-config';
import { logAudit } from '@/lib/db/repositories/audit-log';
import { ApiErrors, errorResponse, successResponse } from '@/lib/utils/api-response';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/crm/meetings/[id]/notes - ask Claude to draft the notes from the
 * saved transcript. Returns straight away with the meeting marked pending;
 * the page polls until it's ready or failed.
 *
 * On Netlify the work runs in the meeting-notes background function (normal
 * requests time out after a few seconds). In development it runs in this
 * server process.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await crmContext('crm.edit');
  if ('response' in ctx) return ctx.response;
  if (!aiNotesEnabled()) return errorResponse("AI notes aren't switched on yet", 503, undefined, 'AI_NOTES_OFF');
  const { id } = await params;
  if (!isValidUUID(id)) return ApiErrors.NotFound('Meeting');

  try {
    const meeting = await getMeeting(ctx.scope, id);
    if (!meeting) return ApiErrors.NotFound('Meeting');
    if (!meeting.transcript) return ApiErrors.BadRequest('Add the transcript first');

    const token = await requestMeetingNotes(id, MEETING_AI_STALE_MINUTES);
    if (!token) return errorResponse('Claude is already drafting these notes', 409, undefined, 'CONFLICT');

    if (process.env.NODE_ENV === 'production') {
      const started = await fetch(`${request.nextUrl.origin}/.netlify/functions/meeting-notes-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: id, token }),
      }).catch((error) => {
        console.error('[meeting-notes] Could not reach the background function:', error);
        return null;
      });
      if (!started || (started.status !== 202 && !started.ok)) {
        await failMeetingNotesStart(id, token, "Couldn't start drafting the notes. Try again.");
        return ApiErrors.ServerError("Couldn't start drafting the notes. Try again.");
      }
    } else {
      void runMeetingNotesJob(id, token);
    }

    await logAudit(ctx.actor, 'draft_notes', 'meeting', id);
    return successResponse(await getMeeting(ctx.scope, id), 'Drafting the notes', 202);
  } catch (error) {
    console.error('Error starting meeting notes:', error);
    return ApiErrors.ServerError("Couldn't start drafting the notes");
  }
}
