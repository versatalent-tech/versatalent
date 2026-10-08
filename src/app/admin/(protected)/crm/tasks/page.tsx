"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { endOfToday, isPast } from "date-fns";
import { CheckSquare, Loader2 } from "lucide-react";
import type { Activity } from "@/lib/crm/types";
import { CrmShell, api, errorMessage, useCrmOptions } from "@/components/crm/shared";
import { TaskCheck, dueLabel } from "@/components/crm/Timeline";

type Who = "me" | "all";

function TaskRow({ task, onChanged, showOwner }: { task: Activity; onChanged: () => void; showOwner: boolean }) {
  const due = dueLabel(task);
  const context = task.deal
    ? { href: `/admin/crm/deals/${task.deal.id}`, label: task.deal.name }
    : task.organisation
      ? { href: `/admin/crm/clients/${task.organisation.id}`, label: task.organisation.name }
      : null;
  return (
    <li className="flex gap-3 rounded-lg border bg-white p-3">
      <TaskCheck activity={task} onChanged={onChanged} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.completed_at ? "text-gray-400 line-through" : ""}`}>{task.subject}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {due && <span className={due.overdue ? "font-medium text-red-600" : ""}>{due.text}</span>}
          {showOwner && task.owner ? ` · ${task.owner.name}` : ""}
          {context && (
            <>
              {" · "}
              <Link href={context.href} className="underline hover:text-gold">
                {context.label}
              </Link>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

export default function TasksPage() {
  const options = useCrmOptions();
  const [who, setWho] = useState<Who>("me");
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api<Activity[]>(`/api/crm/activities?owner=${who}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [who]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const open = tasks.filter((t) => !t.completed_at);
    const today = endOfToday();
    return [
      { title: "Overdue", items: open.filter((t) => isPast(new Date(t.due_at!))) },
      { title: "Today", items: open.filter((t) => !isPast(new Date(t.due_at!)) && new Date(t.due_at!) <= today) },
      { title: "Coming up", items: open.filter((t) => new Date(t.due_at!) > today) },
      { title: "Done in the last 7 days", items: tasks.filter((t) => t.completed_at) },
    ];
  }, [tasks]);

  return (
    <CrmShell
      title={
        <>
          {who === "me" ? "My" : "Team"} <span className="text-gold">Tasks</span>
        </>
      }
      subtitle="Follow-ups from deals and clients. Add tasks from a deal or client page."
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex self-start rounded-md border bg-white p-0.5 text-sm">
          {(["me", "all"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setWho(value)}
              className={`rounded px-3 py-1 ${who === value ? "bg-black text-white" : "text-gray-600"}`}
            >
              {value === "me" ? "Mine" : "Everyone's"}
            </button>
          ))}
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {!loading && tasks.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-gray-500">
          <CheckSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          No tasks. Add one from a deal or client to schedule a follow-up.
        </div>
      ) : (
        <div className="space-y-6">
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.title}>
                <h2 className={`mb-2 text-sm font-semibold ${group.title === "Overdue" ? "text-red-700" : ""}`}>
                  {group.title} ({group.items.length})
                </h2>
                <ul className="space-y-2">
                  {group.items.map((task) => (
                    <TaskRow key={task.id} task={task} onChanged={load} showOwner={who === "all" || task.owner?.id !== options.me} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </CrmShell>
  );
}
