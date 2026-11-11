"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Undo2 } from "lucide-react";
import type { AdmitResult, DoorOrder } from "@/lib/db/repositories/door-tickets";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

/** Find a ticket by name, email or order reference, and let it in (or undo) by hand */
export function TicketSearch({ eventId, onResult }: { eventId: string; onResult: (result: AdmitResult) => void }) {
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<DoorOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setOrders(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/staff/event-day/${eventId}/tickets?q=${encodeURIComponent(q.trim())}`, { credentials: "include" });
        const body = await response.json();
        if (!cancelled) setOrders(response.ok ? body.data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, eventId, refresh]);

  const act = async (ticketId: string, action: "admit" | "undo") => {
    setBusy(ticketId);
    try {
      const response = await fetch(`/api/staff/event-day/${eventId}/tickets/${ticketId}/${action}`, { method: "POST", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (action === "admit" && response.ok) onResult(body.data);
    } finally {
      setBusy(null);
      setRefresh((n) => n + 1);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 focus-within:border-gold">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, email or order reference"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-gray-500 focus:outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </label>
      {orders && orders.length === 0 && !loading && <p className="text-sm text-gray-400">No paid tickets found for this event.</p>}
      {orders && orders.length > 0 && (
        <ul className="max-h-[360px] space-y-2 overflow-y-auto">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="font-semibold">{o.name}</p>
              <p className="text-xs text-gray-400">
                {o.reference} · {o.email}
              </p>
              <ul className="mt-2 space-y-1">
                {o.tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {t.number}. {t.ticket_type_name}
                    </span>
                    {t.admitted_at ? (
                      <span className="flex items-center gap-2 text-green-300">
                        In at {time(t.admitted_at)}
                        <button
                          type="button"
                          onClick={() => act(t.id, "undo")}
                          disabled={busy === t.id}
                          className="text-gray-400 hover:text-white disabled:opacity-40"
                          aria-label={`Undo ticket ${t.number}`}
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => act(t.id, "admit")}
                        disabled={busy === t.id}
                        className="rounded-md bg-gold px-3 py-1 text-xs font-semibold text-black disabled:opacity-40"
                        aria-label={`Admit ticket ${t.number}`}
                      >
                        Admit
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
