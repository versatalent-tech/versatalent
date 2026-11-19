"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { timeAgo } from "@/components/portal/NotificationBell";
import { api, errorMessage } from "@/components/crm/shared";
import type { PortalNotification } from "@/lib/notifications/types";

/** Every team member's own notifications (the last 100, kept for 90 days) */
export default function TeamNotificationsPage() {
  const [items, setItems] = useState<PortalNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: PortalNotification[]; unread: number }>("/api/admin/notifications?limit=all");
      setItems(data.items);
      setUnread(data.unread);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (ids?: string[]) => {
    setBusy(true);
    try {
      await api("/api/admin/notifications/read", { method: "POST", json: ids ? { ids } : {} });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Your <span className="text-gold">Notifications</span>
          </h1>
          <p className="max-w-2xl text-gray-300">
            Tasks given to you, bookings for your talents, and anything waiting for you. Kept for 90 days.
          </p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-8">
        <div className="container mx-auto max-w-3xl space-y-4 px-4">
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{unread > 0 ? `${unread} unread` : "All read"}</p>
            <Button variant="outline" size="sm" disabled={busy || unread === 0} onClick={() => markRead()}>
              Mark all read
            </Button>
          </div>
          {!items ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : items.length === 0 ? (
            <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Nothing yet. We’ll let you know when something changes.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border bg-white" data-testid="team-notifications">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${n.read ? "" : "bg-amber-50/60"}`}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="New" />}
                      {n.link ? (
                        <Link href={n.link} onClick={() => !n.read && markRead([n.id])} className="hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    {n.body && <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>}
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => markRead([n.id])} className="shrink-0">
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
