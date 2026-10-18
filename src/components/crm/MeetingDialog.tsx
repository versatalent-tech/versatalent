"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Deal, Meeting, Organisation } from "@/lib/crm/types";
import { api, errorMessage, Field, selectClass, TalentPicker, type CrmOptionsWithMe } from "./shared";

interface MeetingForm {
  title: string;
  starts: string; // datetime-local
  ends: string;
  location: string;
  organisation_id: string;
  deal_id: string;
  talent_ids: string[];
  attendees: string;
}

/** ISO timestamp → datetime-local value in the browser's time zone */
function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The next whole hour, for a new meeting */
function nextHour(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

function toForm(meeting: Meeting | null, defaults: { dealId?: string; organisationId?: string; talentIds?: string[] }): MeetingForm {
  return {
    title: meeting?.title ?? "",
    starts: meeting ? toLocalInput(meeting.starts_at) : nextHour(),
    ends: toLocalInput(meeting?.ends_at),
    location: meeting?.location ?? "",
    organisation_id: meeting?.organisation?.id ?? defaults.organisationId ?? "",
    deal_id: meeting?.deal?.id ?? defaults.dealId ?? "",
    talent_ids: meeting?.talents.map((t) => t.id) ?? defaults.talentIds ?? [],
    attendees: meeting?.attendees ?? "",
  };
}

export function MeetingDialog({
  open,
  onOpenChange,
  meeting,
  options,
  defaults = {},
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null; // null = new meeting
  options: CrmOptionsWithMe;
  defaults?: { dealId?: string; organisationId?: string; talentIds?: string[] };
  onSaved: (meeting: Meeting) => void;
}) {
  const [form, setForm] = useState<MeetingForm>(() => toForm(meeting, defaults));
  const [clients, setClients] = useState<Organisation[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(meeting, defaults));
    setError(null);
    api<Organisation[]>("/api/crm/organisations").then(setClients).catch(() => undefined);
    api<Deal[]>("/api/crm/deals").then(setDeals).catch(() => undefined);
    // defaults is a fresh object on every render; the ids inside are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meeting, defaults.dealId, defaults.organisationId]);

  const set = <K extends keyof MeetingForm>(key: K, value: MeetingForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Deals of the chosen client; choosing a deal also sets its client
  const dealChoices = form.organisation_id ? deals.filter((d) => d.organisation?.id === form.organisation_id) : deals;
  const chooseDeal = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    setForm((f) => ({ ...f, deal_id: dealId, organisation_id: deal?.organisation?.id ?? f.organisation_id }));
  };

  const save = async () => {
    setError(null);
    if (!form.starts) {
      setError("Enter when the meeting starts");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        starts_at: new Date(form.starts).toISOString(),
        ends_at: form.ends ? new Date(form.ends).toISOString() : null,
        location: form.location,
        organisation_id: form.organisation_id || null,
        deal_id: form.deal_id || null,
        talent_ids: form.talent_ids,
        attendees: form.attendees,
      };
      const saved = meeting
        ? await api<Meeting>(`/api/crm/meetings/${meeting.id}`, { method: "PUT", json: payload })
        : await api<Meeting>("/api/crm/meetings", { method: "POST", json: payload });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit meeting" : "New meeting"}</DialogTitle>
          <DialogDescription>Schedule a meeting, or log one that&apos;s already happened. Add the transcript afterwards.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <Field label="Title">
            <Input id="meeting-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Rider and set times with Fabric" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts">
              <Input id="meeting-starts" type="datetime-local" value={form.starts} onChange={(e) => set("starts", e.target.value)} />
            </Field>
            <Field label="Ends" hint="Optional">
              <Input id="meeting-ends" type="datetime-local" value={form.ends} onChange={(e) => set("ends", e.target.value)} />
            </Field>
          </div>

          <Field label="Where" hint="An address, or Zoom, Google Meet, phone…">
            <Input id="meeting-location" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <select
                id="meeting-client"
                className={selectClass}
                value={form.organisation_id}
                onChange={(e) => setForm((f) => ({ ...f, organisation_id: e.target.value, deal_id: "" }))}
              >
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Deal">
              <select id="meeting-deal" className={selectClass} value={form.deal_id} onChange={(e) => chooseDeal(e.target.value)}>
                <option value="">No deal</option>
                {dealChoices.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                    {deal.organisation && !form.organisation_id ? ` (${deal.organisation.name})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Talents">
            <TalentPicker talents={options.talents} value={form.talent_ids} onChange={(ids) => set("talent_ids", ids)} />
          </Field>

          <Field label="Who's attending" hint="Names and roles, e.g. Sam Lee (promoter), Jo from our team">
            <Textarea id="meeting-attendees" rows={2} value={form.attendees} onChange={(e) => set("attendees", e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {meeting ? "Save changes" : "Add meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
