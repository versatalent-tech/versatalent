"use client";

import { useCallback, useEffect, useState } from "react";
import { format, isBefore, isToday } from "date-fns";
import { CheckSquare, Loader2 } from "lucide-react";
import type { MyTask } from "@/lib/tasks/types";
import { api, errorMessage } from "@/components/crm/shared";

/**
 * Tasks given to the person signed in: road managers on their dashboard,
 * talents in their portal. Ticking one off is saved straight away and shows
 * as done for the team in CRM → Tasks. Hidden when there's nothing to show.
 */
export function MyTasks({ endpoint, title }: { endpoint: "/api/tasks/mine" | "/api/portal/tasks"; title: string }) {
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<MyTask[]>(endpoint)
      .then(setTasks)
      .catch((err) => setError(errorMessage(err)));
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (task: MyTask) => {
    setBusy(task.id);
    setError(null);
    try {
      await api(`${endpoint}/${task.id}`, { method: "PATCH", json: { completed: !task.completed_at } });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (!tasks && !error) return null;
  if (tasks && tasks.length === 0) return null;
  const open = tasks?.filter((t) => !t.completed_at).length ?? 0;

  return (
    <section className="space-y-3" aria-labelledby="my-tasks-title">
      <h2 id="my-tasks-title" className="flex items-center gap-2 text-lg font-semibold">
        <CheckSquare className="h-5 w-5 text-gold" /> {title}
        {open > 0 && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gray-800">{open} to do</span>}
      </h2>
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <ul className="divide-y rounded-xl border bg-white">
        {tasks?.map((task) => {
          const due = task.due_at ? new Date(task.due_at) : null;
          const overdue = !task.completed_at && due && isBefore(due, new Date()) && !isToday(due);
          return (
            <li key={task.id} className="flex items-start gap-3 p-4">
              {busy === task.id ? (
                <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-gray-400" />
              ) : (
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#D4AF37]"
                  checked={Boolean(task.completed_at)}
                  onChange={() => toggle(task)}
                  aria-label={`${task.completed_at ? "Reopen" : "Done"}: ${task.subject}`}
                />
              )}
              <div className="min-w-0">
                <p className={`font-medium ${task.completed_at ? "text-gray-400 line-through" : ""}`}>{task.subject}</p>
                <p className="text-xs text-gray-500">
                  {due && (
                    <span className={overdue ? "font-medium text-red-700" : ""}>
                      {overdue ? "Overdue: " : "Due "}
                      {isToday(due) ? "today" : format(due, "EEE d MMM")}
                    </span>
                  )}
                  {task.added_by ? `${due ? " · " : ""}Added by ${task.added_by}` : ""}
                  {task.completed_at ? ` · Done ${format(new Date(task.completed_at), "d MMM")}` : ""}
                </p>
                {task.source && <p className="text-xs text-gray-500">{task.source}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
