"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingSummary } from "@/lib/crm/types";
import { api, type CrmOptionsWithMe } from "./shared";
import { MeetingDialog } from "./MeetingDialog";

/** "Tue 14 Oct 2026, 10:00–11:30" */
export function meetingWhen(meeting: Pick<MeetingSummary, "starts_at" | "ends_at">): string {
  const start = new Date(meeting.starts_at);
  const text = format(start, "EEE d MMM yyyy, HH:mm");
  if (!meeting.ends_at) return text;
  const end = new Date(meeting.ends_at);
  return isSameDay(start, end) ? `${text}–${format(end, "HH:mm")}` : `${text} – ${format(end, "EEE d MMM, HH:mm")}`;
}

/** Where the meeting's notes are up to, as a small label */
export function MeetingNotesBadge({ meeting }: { meeting: MeetingSummary }) {
  const [label, style] =
    meeting.ai_status === "pending"
      ? ["Drafting notes…", "bg-sky-100 text-sky-800"]
      : meeting.has_notes
        ? meeting.open_action_items > 0
          ? [`${meeting.open_action_items} action item${meeting.open_action_items === 1 ? "" : "s"}`, "bg-amber-100 text-amber-800"]
          : ["Notes", "bg-green-100 text-green-800"]
        : meeting.has_transcript
          ? ["Transcript", "bg-gray-100 text-gray-700"]
          : new Date(meeting.starts_at) > new Date()
            ? ["Upcoming", "bg-indigo-100 text-indigo-800"]
            : ["No notes", "bg-gray-100 text-gray-500"];
  return <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}

/** Meetings card for a deal or client page */
export function MeetingsCard({
  dealId,
  organisationId,
  talentIds,
  options,
}: {
  dealId?: string;
  organisationId?: string;
  talentIds?: string[];
  options: CrmOptionsWithMe;
}) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    const query = dealId ? `dealId=${dealId}` : `organisationId=${organisationId}`;
    api<MeetingSummary[]>(`/api/crm/meetings?${query}`).then(setMeetings).catch(() => undefined);
  }, [dealId, organisationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meetings</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="text-sm text-gray-500">No meetings yet.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.slice(0, 8).map((meeting) => (
              <li key={meeting.id}>
                <Link href={`/admin/crm/meetings/${meeting.id}`} className="block hover:text-gold">
                  <p className="flex items-start justify-between gap-2 text-sm font-medium">
                    <span className="min-w-0">{meeting.title}</span>
                    <MeetingNotesBadge meeting={meeting} />
                  </p>
                  <p className="text-xs text-gray-500">{meetingWhen(meeting)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {meetings.length > 8 && (
          <Link href="/admin/crm/meetings" className="mt-3 block text-xs text-gray-500 underline hover:text-gold">
            All meetings
          </Link>
        )}
      </CardContent>

      <MeetingDialog
        open={adding}
        onOpenChange={setAdding}
        meeting={null}
        options={options}
        defaults={{ dealId, organisationId, talentIds }}
        onSaved={(meeting) => router.push(`/admin/crm/meetings/${meeting.id}`)}
      />
    </Card>
  );
}
