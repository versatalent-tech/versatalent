"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { PortalNotification } from "@/lib/notifications/types";
import { api } from "@/components/crm/shared";

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Portal header bell: unread count, and the latest notifications when opened (which marks them read) */
export function NotificationBell() {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: PortalNotification[]; unread: number }>("/api/portal/notifications");
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // The bell stays as it was; the next poll tries again
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = async () => {
    const opening = !open;
    setOpen(opening);
    if (opening && unread > 0) {
      setUnread(0);
      await api("/api/portal/notifications/read", { method: "POST", json: {} }).catch(() => undefined);
    }
  };

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex items-center p-1 text-gray-300 hover:text-gold"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1 min-w-[1.1rem] rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-[1.1rem] text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white text-black shadow-lg">
          <p className="border-b border-gray-100 px-4 py-2 text-sm font-semibold">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Nothing yet. We’ll let you know when something changes.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
              {items.map((n) => {
                const content = (
                  <>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="New" />}
                      {n.title}
                    </span>
                    {n.body && <span className="mt-0.5 block text-sm text-gray-600">{n.body}</span>}
                    <span className="mt-1 block text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                  </>
                );
                return (
                  <li key={n.id} className={n.read ? "" : "bg-amber-50/60"}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-gray-50">
                        {content}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
