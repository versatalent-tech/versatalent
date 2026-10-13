"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MeetingSummary } from "@/lib/crm/types";
import { CrmShell, api, errorMessage, useCrmOptions } from "@/components/crm/shared";
import { MeetingDialog } from "@/components/crm/MeetingDialog";
import { MeetingNotesBadge, meetingWhen } from "@/components/crm/Meetings";

type View = "upcoming" | "past";

function MeetingRow({ meeting }: { meeting: MeetingSummary }) {
  const context = [meeting.organisation?.name, meeting.deal?.name, ...meeting.talents.map((t) => t.name)].filter(Boolean);
  return (
    <li>
      <Link href={`/admin/crm/meetings/${meeting.id}`} className="flex gap-3 rounded-lg border bg-white p-3 hover:border-gold">
        <div className="min-w-0 flex-1">
          <p className="flex items-start justify-between gap-2 text-sm font-medium">
            <span className="min-w-0">{meeting.title}</span>
            <MeetingNotesBadge meeting={meeting} />
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {meetingWhen(meeting)}
            {meeting.location ? ` · ${meeting.location}` : ""}
          </p>
          {context.length > 0 && <p className="mt-0.5 truncate text-xs text-gray-500">{context.join(" · ")}</p>}
        </div>
      </Link>
    </li>
  );
}

export default function MeetingsPage() {
  const router = useRouter();
  const options = useCrmOptions();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [view, setView] = useState<View>("past");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMeetings(await api<MeetingSummary[]>("/api/crm/meetings"));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    const inView = meetings.filter((m) => (view === "upcoming" ? new Date(m.starts_at).getTime() >= now : new Date(m.starts_at).getTime() < now));
    const matching = q
      ? inView.filter((m) =>
          [m.title, m.location, m.organisation?.name, m.deal?.name, ...m.talents.map((t) => t.name)]
            .filter(Boolean)
            .some((text) => text!.toLowerCase().includes(q))
        )
      : inView;
    // Upcoming: soonest first. Past: most recent first (the API's order).
    return view === "upcoming" ? [...matching].reverse() : matching;
  }, [meetings, view, query]);

  return (
    <CrmShell
      title={
        <>
          <span className="text-gold">Meetings</span>
        </>
      }
      subtitle={
        options.aiNotes
          ? "Meetings with clients and talents. Paste a transcript and Claude drafts the notes and action items for you to check."
          : "Meetings with clients and talents: notes, decisions and action items that become tasks."
      }
      actions={
        <Button onClick={() => setAdding(true)} className="bg-gold text-black hover:bg-gold/90">
          <Plus className="mr-2 h-4 w-4" />
          New meeting
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border bg-white p-0.5 text-sm">
          {(["past", "upcoming"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`rounded px-3 py-1 ${view === value ? "bg-black text-white" : "text-gray-600"}`}
              aria-pressed={view === value}
            >
              {value === "past" ? "Past" : "Upcoming"}
            </button>
          ))}
        </div>
        <Input
          id="meetings-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, client, deal or talent"
          className="max-w-xs bg-white"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {!loading && shown.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-gray-500">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          {query
            ? "No meetings match your search."
            : view === "upcoming"
              ? "No upcoming meetings. Add one here or from a deal or client."
              : options.aiNotes
                ? "No meetings logged yet. Add one, paste its transcript, and Claude will draft the notes."
                : "No meetings logged yet. Add one to keep its notes and action items."}
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} />
          ))}
        </ul>
      )}

      <MeetingDialog
        open={adding}
        onOpenChange={setAdding}
        meeting={null}
        options={options}
        onSaved={(meeting) => router.push(`/admin/crm/meetings/${meeting.id}`)}
      />
    </CrmShell>
  );
}
