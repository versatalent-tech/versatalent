"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/components/crm/shared";

/** Lets a talent subscribe to their bookings from their phone's calendar */
export function PortalCalendarLink() {
  const [active, setActive] = useState<boolean | null>(null);
  const [link, setLink] = useState<{ url: string; webcal: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ active: boolean }>("/api/portal/calendar-feed").then((s) => setActive(s.active)).catch(() => undefined);
  }, []);

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      setLink(await api<{ url: string; webcal: string }>("/api/portal/calendar-feed", { method: "POST" }));
      setActive(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm("Turn off your calendar link? Your phone calendar will stop updating.")) return;
    await api("/api/portal/calendar-feed", { method: "DELETE" }).catch(() => undefined);
    setLink(null);
    setActive(false);
  };

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex items-start gap-3">
        <CalendarPlus className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
        <div>
          <h2 className="font-semibold">See bookings in your phone&apos;s calendar</h2>
          <p className="text-sm text-gray-500">A private link that keeps your calendar up to date automatically.</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {link ? (
        <div className="space-y-2">
          <Button asChild className="w-full bg-gold text-black hover:bg-gold/90">
            <a href={link.webcal}>Add to iPhone / Mac calendar</a>
          </Button>
          <div className="flex gap-2">
            <Input readOnly value={link.url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
            <Button
              variant="outline"
              aria-label="Copy link"
              onClick={async () => {
                await navigator.clipboard.writeText(link.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Google Calendar: Other calendars → + → From URL, then paste. Keep this link private.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={issue} disabled={busy} variant="outline">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {active ? "Get a new link" : "Get my calendar link"}
          </Button>
          {active && (
            <Button onClick={revoke} variant="ghost" className="text-red-700">
              Turn off
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
