"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PROFILE_STATS,
  PROFILE_STAT_KEYS,
  type ProfileStatDetails,
} from "@/lib/talents/profile-stats";

/**
 * Talent edit dialog: the figures in the profile hero. Counted figures come
 * from bookings and events; the admin adds earlier work or hides a figure.
 * Saved on its own, separately from the rest of the profile.
 */
export function ProfileStatsEditor({ talentId }: { talentId: string }) {
  const [stats, setStats] = useState<ProfileStatDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/talents/${talentId}/stats`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setStats(data.stats);
        else setError(data.error ?? "Couldn't load the figures");
      })
      .catch(() => !cancelled && setError("Couldn't load the figures"));
    return () => {
      cancelled = true;
    };
  }, [talentId]);

  const change = (key: (typeof PROFILE_STAT_KEYS)[number], patch: { extra?: number; hidden?: boolean }) => {
    setSaved(false);
    setDirty(true);
    setStats((prev) => {
      if (!prev) return prev;
      const next = { ...prev[key], ...patch };
      return { ...prev, [key]: { ...next, total: next.counted + next.extra } };
    });
  };

  const save = async () => {
    if (!stats) return;
    setSaving(true);
    setError(null);
    try {
      const body = Object.fromEntries(PROFILE_STAT_KEYS.map((key) => [key, { extra: stats[key].extra, hidden: stats[key].hidden }]));
      const res = await fetch(`/api/talents/${talentId}/stats`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save the figures");
      setStats(data.stats);
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the figures");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">Profile figures</h3>
        <p className="text-sm text-gray-500">
          Shown at the top of the public profile. They&apos;re counted from finished bookings and events and go up by
          themselves. Add work done before it was recorded here, or hide a figure. Figures of 0 aren&apos;t shown.
        </p>
      </div>

      {!stats && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {stats && (
        <div className="space-y-2">
          {PROFILE_STATS.map((def) => {
            const s = stats[def.key];
            return (
              <div key={def.key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:items-center rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{def.plural}</p>
                  <p className="text-xs text-gray-500">{def.definition}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Counted: {s.counted} · Shown: {s.hidden ? "hidden" : s.total > 0 ? s.total : "not shown (0)"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 whitespace-nowrap">+ earlier work</span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="w-24"
                    value={s.extra}
                    onChange={(e) => change(def.key, { extra: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                    aria-label={`Earlier ${def.plural.toLowerCase()} not recorded here`}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={!s.hidden}
                    onChange={(e) => change(def.key, { hidden: !e.target.checked })}
                  />
                  Show
                </label>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {stats && (
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save figures"}
          </Button>
          {saved && <span className="text-sm text-green-700">Saved</span>}
          {dirty && <span className="text-sm text-amber-700">Not saved yet: “Save Changes” below doesn&apos;t save these</span>}
        </div>
      )}
    </div>
  );
}
