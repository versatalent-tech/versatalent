"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TalentAvailability } from "@/lib/portal/types";
import { api, errorMessage, selectClass } from "@/components/crm/shared";

const day = (value: string) => format(new Date(`${value}T00:00:00`), "EEE d MMM yyyy");

export default function PortalAvailabilityPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<TalentAvailability[] | null>(null);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [kind, setKind] = useState<"unavailable" | "tentative">("unavailable");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<TalentAvailability[]>("/api/portal/availability").then(setEntries).catch((err) => setError(errorMessage(err)));
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      setEntries(
        await api<TalentAvailability[]>("/api/portal/availability", {
          method: "POST",
          json: { starts_on: startsOn, ends_on: endsOn < startsOn ? startsOn : endsOn, kind, note },
        })
      );
      setNote("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: TalentAvailability) => {
    await api(`/api/portal/availability/${entry.id}`, { method: "DELETE" }).catch((err) => setError(errorMessage(err)));
    setEntries((list) => list?.filter((e) => e.id !== entry.id) ?? null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Days off</h1>
        <p className="text-sm text-gray-500">Tell the team when you can&apos;t work, so you&apos;re not booked on those days.</p>
      </div>

      <form onSubmit={add} className="space-y-3 rounded-xl border bg-white p-4">
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">From</span>
            <Input type="date" value={startsOn} min={today} onChange={(e) => setStartsOn(e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">To</span>
            <Input type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} required />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Type">
            <option value="unavailable">I can&apos;t work</option>
            <option value="tentative">I might not be able to</option>
          </select>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional), e.g. holiday" />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-gold text-black hover:bg-gold/90 sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add
        </Button>
      </form>

      {!entries ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No days off added.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {entry.starts_on === entry.ends_on ? day(entry.starts_on) : `${day(entry.starts_on)} – ${day(entry.ends_on)}`}
                </p>
                <p className="text-sm text-gray-500">
                  {entry.kind === "unavailable" ? "Can't work" : "Might not be able to"}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </div>
              <button onClick={() => remove(entry)} aria-label="Remove" className="text-gray-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
