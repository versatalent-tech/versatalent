"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AVAILABILITY_KINDS, type AvailabilityKind } from "@/lib/bookings/types";
import { Field, api, errorMessage, selectClass } from "@/components/crm/shared";
import type { BookingOptions } from "./BookingDialog";

export function AvailabilityDialog({
  open,
  onOpenChange,
  options,
  defaultDay,
  defaultTalentId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: BookingOptions;
  defaultDay?: string;
  defaultTalentId?: string;
  onSaved: () => void;
}) {
  const [talentId, setTalentId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [kind, setKind] = useState<AvailabilityKind>("unavailable");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setTalentId(defaultTalentId ?? (options.talents.length === 1 ? options.talents[0].id : ""));
    setStartsOn(defaultDay ?? today);
    setEndsOn(defaultDay ?? today);
    setKind("unavailable");
    setNote("");
    setError(null);
  }, [open, defaultDay, defaultTalentId, options.talents]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/availability", {
        method: "POST",
        json: { talent_id: talentId, starts_on: startsOn, ends_on: endsOn < startsOn ? startsOn : endsOn, kind, note },
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark unavailable</DialogTitle>
          <DialogDescription>Days a talent can&apos;t work. New bookings on these days get a warning.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <Field label="Talent">
            <select className={selectClass} value={talentId} onChange={(e) => setTalentId(e.target.value)}>
              <option value="">Choose…</option>
              {options.talents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From">
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </Field>
            <Field label="To (inclusive)">
              <Input type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </Field>
          </div>
          <Field label="Type">
            <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as AvailabilityKind)}>
              {Object.entries(AVAILABILITY_KINDS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. holiday, exams" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !talentId} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarFeedDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [status, setStatus] = useState<{ active: boolean; available: boolean } | null>(null);
  const [link, setLink] = useState<{ url: string; webcal: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLink(null);
    setError(null);
    api<{ active: boolean; available: boolean }>("/api/calendar/feed").then(setStatus).catch((err) => setError(errorMessage(err)));
  }, [open]);

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      setLink(await api<{ url: string; webcal: string }>("/api/calendar/feed", { method: "POST" }));
      setStatus((s) => (s ? { ...s, active: true } : s));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm("Turn off your calendar link? Calendars subscribed to it will stop updating.")) return;
    setBusy(true);
    try {
      await api("/api/calendar/feed", { method: "DELETE" });
      setLink(null);
      setStatus((s) => (s ? { ...s, active: false } : s));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to your own calendar</DialogTitle>
          <DialogDescription>
            A private link that keeps Google Calendar, Apple Calendar or Outlook in sync with the bookings you can see. It
            never includes fees.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
          {status && !status.available && (
            <p className="rounded border bg-gray-50 p-3">
              Calendar links need a personal account. Add yourself on the Team page and sign in with your own email.
            </p>
          )}
          {link ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={link.url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  aria-label="Copy link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-gray-600">
                <li>
                  <strong>Apple Calendar / iPhone:</strong>{" "}
                  <a href={link.webcal} className="text-gold underline">
                    open this link
                  </a>{" "}
                  and confirm.
                </li>
                <li>
                  <strong>Google Calendar:</strong> Other calendars → + → From URL, then paste the link.
                </li>
                <li>
                  <strong>Outlook:</strong> Add calendar → Subscribe from web.
                </li>
              </ul>
              <p className="text-xs text-gray-500">This link is shown once. Anyone who has it can see these bookings, so keep it to yourself.</p>
            </>
          ) : (
            status?.available && (
              <p className="text-gray-600">
                {status.active
                  ? "You already have a calendar link. Creating a new one stops the old one working."
                  : "You don't have a calendar link yet."}
              </p>
            )
          )}
        </div>
        <DialogFooter className="gap-2">
          {status?.active && (
            <Button variant="outline" onClick={revoke} disabled={busy} className="mr-auto text-red-700">
              Turn off link
            </Button>
          )}
          {status?.available && !link && (
            <Button onClick={issue} disabled={busy} className="bg-gold text-black hover:bg-gold/90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status.active ? "Create a new link" : "Create my link"}
            </Button>
          )}
          {link && <Button onClick={() => onOpenChange(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
