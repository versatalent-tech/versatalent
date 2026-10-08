"use client";

import { useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOGGABLE_ACTIVITY_TYPES, type Activity, type ActivityType } from "@/lib/crm/types";
import { api, errorMessage, selectClass, type CrmOptionsWithMe } from "./shared";

const ICONS: Record<ActivityType, React.ElementType> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CalendarClock,
  stage_change: ArrowRightLeft,
  system: Info,
};

type Loggable = keyof typeof LOGGABLE_ACTIVITY_TYPES;

/** Default due time for a new task: tomorrow at 10:00, as a datetime-local value */
function tomorrowAtTen(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ActivityComposer({
  links,
  options,
  onSaved,
}: {
  links: { deal_id?: string; organisation_id?: string; contact_id?: string };
  options: CrmOptionsWithMe;
  onSaved: () => void;
}) {
  const [type, setType] = useState<Loggable>("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState(tomorrowAtTen);
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/crm/activities", {
        method: "POST",
        json: {
          ...links,
          type,
          subject: subject || LOGGABLE_ACTIVITY_TYPES[type],
          body,
          due_at: type === "task" ? new Date(due).toISOString() : null,
          owner_user_id: type === "task" && owner ? owner : null,
        },
      });
      setSubject("");
      setBody("");
      setDue(tomorrowAtTen());
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(LOGGABLE_ACTIVITY_TYPES) as Loggable[]).map((key) => {
          const Icon = ICONS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
                type === key ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {key === "task" ? "Task" : LOGGABLE_ACTIVITY_TYPES[key]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={type === "task" ? "What needs doing? e.g. Send proposal" : "Summary, e.g. Called about dates"}
      />
      {type !== "task" && (
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details (optional)" />
      )}
      {type === "task" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due" />
          <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Assign to">
            <option value="">Assign to me</option>
            {options.owners
              .filter((o) => o.id !== options.me)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || (type === "task" && !subject.trim())} size="sm" className="bg-gold text-black hover:bg-gold/90">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {type === "task" ? "Add task" : "Log it"}
        </Button>
      </div>
    </div>
  );
}

export function TaskCheck({ activity, onChanged }: { activity: Activity; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const done = Boolean(activity.completed_at);
  const toggle = async () => {
    setBusy(true);
    try {
      await api(`/api/crm/activities/${activity.id}`, { method: "PATCH", json: { completed: !done } });
      onChanged();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-600"
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <Circle className="h-5 w-5" />
      )}
    </button>
  );
}

export function dueLabel(activity: Activity): { text: string; overdue: boolean } | null {
  if (!activity.due_at) return null;
  const due = new Date(activity.due_at);
  const overdue = !activity.completed_at && isPast(due);
  return { text: `${overdue ? "Overdue · " : "Due "}${format(due, "EEE d MMM, HH:mm")}`, overdue };
}

export function Timeline({
  activities,
  options,
  onChanged,
  showContext = false,
}: {
  activities: Activity[];
  options: CrmOptionsWithMe;
  onChanged: () => void;
  showContext?: boolean; // show which deal an entry belongs to (client page)
}) {
  const remove = async (activity: Activity) => {
    if (!window.confirm("Delete this entry?")) return;
    await api(`/api/crm/activities/${activity.id}`, { method: "DELETE" }).catch((err) => window.alert(errorMessage(err)));
    onChanged();
  };

  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">Nothing logged yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity) => {
        const Icon = ICONS[activity.type];
        const due = dueLabel(activity);
        const automatic = activity.type === "system" || activity.type === "stage_change";
        const canDelete = !automatic && (options.canDelete || (activity.created_by !== null && activity.created_by === options.me));
        return (
          <li key={activity.id} className="flex gap-3 rounded-lg border bg-white p-3">
            {activity.type === "task" ? (
              <TaskCheck activity={activity} onChanged={onChanged} />
            ) : (
              <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${automatic ? "text-gray-300" : "text-gold"}`} />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${automatic ? "text-gray-500" : "font-medium"} ${activity.completed_at && activity.type === "task" ? "line-through" : ""}`}>
                {activity.subject}
              </p>
              {activity.body && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{activity.body}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {due && <span className={due.overdue ? "font-medium text-red-600" : ""}>{due.text} · </span>}
                {activity.type === "task" && activity.owner ? `${activity.owner.name} · ` : ""}
                {showContext && activity.deal ? `${activity.deal.name} · ` : ""}
                {activity.created_by_name ? `${activity.created_by_name}, ` : ""}
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
            {canDelete && (
              <button type="button" onClick={() => remove(activity)} aria-label="Delete" className="text-gray-300 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
