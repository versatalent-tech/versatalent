"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TRANSCRIPT_CHARS, MEETING_AI_STALE_MINUTES, type Meeting } from "@/lib/crm/types";
import { CrmShell, api, errorMessage, selectClass, type CrmOptionsWithMe, useCrmOptions } from "@/components/crm/shared";
import { MeetingDialog } from "@/components/crm/MeetingDialog";
import { meetingWhen } from "@/components/crm/Meetings";

const POLL_MS = 4000;

interface ItemForm {
  id: string;
  title: string;
  owner_user_id: string;
  owner_name: string;
  due_date: string;
  task_activity_id: string | null;
  selected: boolean;
}

interface NotesForm {
  summary: string;
  decisions: string; // one per line
  items: ItemForm[];
}

function notesFrom(meeting: Meeting): NotesForm {
  return {
    summary: meeting.summary ?? "",
    decisions: meeting.decisions.join("\n"),
    items: meeting.action_items.map((item) => ({
      id: item.id,
      title: item.title,
      owner_user_id: item.owner_user_id ?? "",
      owner_name: item.owner_name ?? "",
      due_date: item.due_date ?? "",
      task_activity_id: item.task_activity_id,
      selected: !item.task_activity_id,
    })),
  };
}

/** Which version of the notes the form was filled from (a new draft, a save, or items turned into tasks) */
function notesVersion(meeting: Meeting): string {
  const tasks = meeting.action_items.map((item) => item.task_activity_id ?? "").join(",");
  return `${meeting.ai_generated_at}|${meeting.notes_reviewed_at}|${tasks}`;
}

/** Caption files (.vtt, .srt) → plain "Speaker: words" lines */
function cleanCaptions(text: string, filename: string): string {
  if (!/\.(vtt|srt)$/i.test(filename)) return text.trim();
  return text
    .split(/\r?\n/)
    .filter((line) => !/^WEBVTT/.test(line) && !/^NOTE\b/.test(line) && !/^\d+$/.test(line.trim()) && !line.includes("-->"))
    .map((line) => line.replace(/<v\s+([^>]+)>/g, "$1: ").replace(/<\/?[^>]+>/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

function TranscriptCard({
  meeting,
  aiNotes,
  onSaved,
}: {
  meeting: Meeting;
  aiNotes: boolean;
  onSaved: (meeting: Meeting) => void;
}) {
  const [text, setText] = useState(meeting.transcript ?? "");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(meeting.transcript ?? "");
    setConsent(false);
  }, [meeting.transcript]);

  const changed = text.trim() !== (meeting.transcript ?? "").trim();
  const tooLong = text.length > MAX_TRANSCRIPT_CHARS;

  const readFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_TRANSCRIPT_CHARS * 4) {
      setError("That file is too large for a transcript.");
      return;
    }
    setText(cleanCaptions(await file.text(), file.name));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await api<Meeting>(`/api/crm/meetings/${meeting.id}`, {
          method: "PATCH",
          json: { transcript: text.trim() || null, recording_consent: consent },
        })
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Transcript</CardTitle>
        <input
          ref={fileInput}
          id="transcript-file"
          type="file"
          accept=".txt,.vtt,.srt,.md,text/plain,text/vtt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = "";
          }}
        />
        <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
          <FileUp className="mr-1 h-4 w-4" />
          Upload file
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <Textarea
          id="transcript-text"
          rows={meeting.transcript ? 10 : 6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the transcript from Google Meet, Zoom, Teams or Otter, or upload a .txt, .vtt or .srt file."
          className="font-mono text-xs"
        />
        <p className={`text-xs ${tooLong ? "font-medium text-red-600" : "text-gray-500"}`}>
          {text.length.toLocaleString("en-GB")} / {MAX_TRANSCRIPT_CHARS.toLocaleString("en-GB")} characters
          {tooLong && ". Split the meeting into parts."}
        </p>

        {changed && text.trim() && (
          <label className="flex items-start gap-2 text-sm">
            <input
              id="transcript-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#D4AF37]"
            />
            <span>Everyone in the meeting was told it was being recorded or transcribed.</span>
          </label>
        )}
        {!changed && meeting.transcript_consent_at && (
          <p className="text-xs text-gray-500">
            Recording notice confirmed {format(new Date(meeting.transcript_consent_at), "d MMM yyyy")}.
          </p>
        )}

        {changed && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={save}
              disabled={saving || tooLong || (Boolean(text.trim()) && !consent)}
              className="bg-gold text-black hover:bg-gold/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {text.trim() ? "Save transcript" : "Remove transcript"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setText(meeting.transcript ?? "")} disabled={saving}>
              Cancel
            </Button>
          </div>
        )}
        {aiNotes && <p className="text-xs text-gray-500">To draft notes, the transcript is sent to Anthropic&apos;s Claude API.</p>}
      </CardContent>
    </Card>
  );
}

function DraftStatus({
  meeting,
  starting,
  onDraft,
}: {
  meeting: Meeting;
  starting: boolean;
  onDraft: () => void;
}) {
  if (meeting.ai_status === "pending") {
    const stale =
      meeting.ai_requested_at && Date.now() - new Date(meeting.ai_requested_at).getTime() > MEETING_AI_STALE_MINUTES * 60_000;
    return stale ? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          This is taking longer than expected.
        </span>
        <Button size="sm" variant="outline" onClick={onDraft} disabled={starting}>
          Try again
        </Button>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <Loader2 className="h-4 w-4 animate-spin" />
        Claude is drafting the notes. This usually takes under a minute, and you can leave this page.
      </div>
    );
  }
  if (meeting.ai_status === "failed" && meeting.ai_error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <span>{meeting.ai_error}</span>
        <Button size="sm" variant="outline" onClick={onDraft} disabled={starting}>
          Try again
        </Button>
      </div>
    );
  }
  return null;
}

function NotesCard({
  meeting,
  options,
  onChanged,
}: {
  meeting: Meeting;
  options: CrmOptionsWithMe;
  onChanged: (meeting: Meeting) => void;
}) {
  const [form, setForm] = useState<NotesForm>(() => notesFrom(meeting));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "tasks" | "draft">(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const version = useRef(notesVersion(meeting));

  // New notes on the server (Claude finished, or a save): show them
  useEffect(() => {
    if (notesVersion(meeting) !== version.current) {
      version.current = notesVersion(meeting);
      setForm(notesFrom(meeting));
      setDirty(false);
    }
  }, [meeting]);

  const edit = (update: (form: NotesForm) => NotesForm) => {
    setForm(update);
    setDirty(true);
  };
  const editItem = (id: string, changes: Partial<ItemForm>) =>
    edit((f) => ({ ...f, items: f.items.map((item) => (item.id === id ? { ...item, ...changes } : item)) }));

  const pending = meeting.ai_status === "pending";
  const hasNotes = Boolean(form.summary.trim() || form.decisions.trim() || form.items.length);
  const selected = form.items.filter((item) => item.selected && !item.task_activity_id && item.title.trim());

  const payload = () => ({
    summary: form.summary,
    decisions: form.decisions
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean),
    action_items: form.items
      .filter((item) => item.title.trim())
      .map((item) => ({
        id: item.id,
        title: item.title,
        owner_user_id: item.owner_user_id || null,
        owner_name: item.owner_name || null,
        due_date: item.due_date || null,
      })),
  });

  const save = async (): Promise<Meeting | null> => {
    setBusy("save");
    setMessage(null);
    try {
      const saved = await api<Meeting>(`/api/crm/meetings/${meeting.id}`, { method: "PATCH", json: payload() });
      onChanged(saved);
      return saved;
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const addTasks = async () => {
    const ids = selected.map((item) => item.id);
    if (dirty && !(await save())) return;
    setBusy("tasks");
    setMessage(null);
    try {
      const response = await fetch(`/api/crm/meetings/${meeting.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: ids }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) throw new Error(body.error || "Failed to add the tasks");
      onChanged(body.data);
      setMessage({ kind: "info", text: body.message });
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const draft = async () => {
    if (hasNotes && !window.confirm("Claude will replace these notes with a new draft. Action items already added as tasks stay. Continue?")) {
      return;
    }
    setBusy("draft");
    setMessage(null);
    try {
      onChanged(await api<Meeting>(`/api/crm/meetings/${meeting.id}/notes`, { method: "POST" }));
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const ownerLabel = (item: ItemForm) =>
    item.owner_name && !item.owner_user_id ? `${item.owner_name} (not on the team)` : "No owner";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Notes</CardTitle>
        {options.aiNotes && meeting.transcript && !pending && (
          <Button size="sm" variant="outline" onClick={draft} disabled={busy !== null}>
            {busy === "draft" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            {meeting.ai_generated_at || hasNotes ? "Redraft with Claude" : "Draft with Claude"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <DraftStatus meeting={meeting} starting={busy === "draft"} onDraft={draft} />
        {message && (
          <div
            className={`rounded border p-3 text-sm ${
              message.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {meeting.ai_generated_at && !meeting.notes_reviewed_at && !pending && (
          <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Drafted by Claude {format(new Date(meeting.ai_generated_at), "d MMM 'at' HH:mm")}. Check it against the transcript, edit, then save.
          </p>
        )}

        {!hasNotes && (
          <p className="text-sm text-gray-500">
            {options.aiNotes && !meeting.transcript
              ? "Add the transcript and Claude will draft a summary, decisions and action items. Or write the notes yourself below."
              : "Write a summary, the decisions made and the action items. Action items can become tasks."}
          </p>
        )}

        <fieldset disabled={pending || busy !== null} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Summary</span>
            <Textarea id="notes-summary" rows={6} value={form.summary} onChange={(e) => edit((f) => ({ ...f, summary: e.target.value }))} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Decisions</span>
            <Textarea
              id="notes-decisions"
              rows={4}
              value={form.decisions}
              onChange={(e) => edit((f) => ({ ...f, decisions: e.target.value }))}
              placeholder="One per line"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Action items</span>
            {form.items.length === 0 && <p className="text-sm text-gray-500">None yet.</p>}
            <ul className="space-y-2">
              {form.items.map((item) => (
                <li key={item.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-start gap-2">
                    {item.task_activity_id ? (
                      <CheckCircle2 className="mt-2 h-4 w-4 flex-shrink-0 text-green-600" aria-label="Added as a task" />
                    ) : (
                      <input
                        id={`item-select-${item.id}`}
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((i) => (i.id === item.id ? { ...i, selected: e.target.checked } : i)) }))}
                        className="mt-2.5 h-4 w-4 flex-shrink-0 accent-[#D4AF37]"
                        aria-label="Include when adding tasks"
                      />
                    )}
                    <Input
                      id={`item-title-${item.id}`}
                      value={item.title}
                      onChange={(e) => editItem(item.id, { title: e.target.value })}
                      placeholder="What needs doing"
                      disabled={Boolean(item.task_activity_id)}
                    />
                    {!item.task_activity_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => edit((f) => ({ ...f, items: f.items.filter((i) => i.id !== item.id) }))}
                        aria-label="Remove action item"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {item.task_activity_id ? (
                    <p className="ml-6 mt-1 text-xs text-gray-500">
                      Added as a task{item.owner_name ? ` for ${item.owner_name}` : ""}.{" "}
                      <Link href="/admin/crm/tasks" className="underline hover:text-gold">
                        Tasks
                      </Link>
                    </p>
                  ) : (
                    <div className="ml-6 mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        id={`item-owner-${item.id}`}
                        className={selectClass}
                        value={item.owner_user_id}
                        onChange={(e) => {
                          const owner = options.owners.find((o) => o.id === e.target.value);
                          editItem(item.id, { owner_user_id: e.target.value, owner_name: owner?.name ?? item.owner_name });
                        }}
                        aria-label="Owner"
                      >
                        <option value="">{ownerLabel(item)}</option>
                        {options.owners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        id={`item-due-${item.id}`}
                        type="date"
                        value={item.due_date}
                        onChange={(e) => editItem(item.id, { due_date: e.target.value })}
                        aria-label="Due date"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                edit((f) => ({
                  ...f,
                  items: [
                    ...f.items,
                    { id: crypto.randomUUID(), title: "", owner_user_id: "", owner_name: "", due_date: "", task_activity_id: null, selected: true },
                  ],
                }))
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add action item
            </Button>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={() => save()} disabled={!dirty || pending || busy !== null} className="bg-gold text-black hover:bg-gold/90">
            {busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save notes
          </Button>
          <Button variant="outline" onClick={addTasks} disabled={selected.length === 0 || pending || busy !== null}>
            {busy === "tasks" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {selected.length || ""} selected as task{selected.length === 1 ? "" : "s"}
          </Button>
          {meeting.notes_reviewed_at && !dirty && (
            <span className="text-xs text-gray-500">
              Saved{meeting.notes_reviewed_by_name ? ` by ${meeting.notes_reviewed_by_name}` : ""}{" "}
              {format(new Date(meeting.notes_reviewed_at), "d MMM 'at' HH:mm")}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Tasks go on the meeting&apos;s deal or client, to the owner you chose, due on the date given or a week after the meeting.
        </p>
      </CardContent>
    </Card>
  );
}

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const options = useCrmOptions();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      setMeeting(await api<Meeting>(`/api/crm/meetings/${id}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // While Claude is drafting, check back every few seconds
  useEffect(() => {
    if (meeting?.ai_status !== "pending") return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [meeting?.ai_status, load]);

  const remove = async () => {
    if (!meeting || !window.confirm(`Delete “${meeting.title}” with its transcript and notes? Tasks made from it stay.`)) return;
    try {
      await api(`/api/crm/meetings/${meeting.id}`, { method: "DELETE" });
      router.push("/admin/crm/meetings");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!meeting) {
    return (
      <CrmShell title="Meeting">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        ) : (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        )}
      </CrmShell>
    );
  }

  const canDelete = options.canDelete || (meeting.created_by !== null && meeting.created_by === options.me);

  return (
    <CrmShell
      title={meeting.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <span>{meetingWhen(meeting)}</span>
          {meeting.organisation && (
            <>
              <span>·</span>
              <Link href={`/admin/crm/clients/${meeting.organisation.id}`} className="underline hover:text-gold">
                {meeting.organisation.name}
              </Link>
            </>
          )}
          {meeting.deal && (
            <>
              <span>·</span>
              <Link href={`/admin/crm/deals/${meeting.deal.id}`} className="underline hover:text-gold">
                {meeting.deal.name}
              </Link>
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              onClick={remove}
              aria-label="Delete meeting"
              className="border-white/40 bg-transparent text-white hover:bg-red-600 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      }
    >
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <NotesCard meeting={meeting} options={options} onChanged={setMeeting} />
          <TranscriptCard meeting={meeting} aiNotes={options.aiNotes} onSaved={setMeeting} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Detail label="When">{meetingWhen(meeting)}</Detail>
                <Detail label="Where">{meeting.location ?? "—"}</Detail>
                <Detail label="Talents">{meeting.talents.length ? meeting.talents.map((t) => t.name).join(", ") : "None"}</Detail>
                {meeting.attendees && (
                  <Detail label="Attending">
                    <span className="whitespace-pre-wrap">{meeting.attendees}</span>
                  </Detail>
                )}
                <Detail label="Added">
                  {format(new Date(meeting.created_at), "d MMM yyyy")}
                  {meeting.created_by_name ? ` by ${meeting.created_by_name}` : ""}
                </Detail>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <MeetingDialog open={editing} onOpenChange={setEditing} meeting={meeting} options={options} onSaved={setMeeting} />
    </CrmShell>
  );
}
