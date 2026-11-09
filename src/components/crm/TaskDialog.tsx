"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Deal, Organisation } from "@/lib/crm/types";
import { AssigneeOptions, api, errorMessage, Field, selectClass, type CrmOptionsWithMe } from "./shared";
import { tomorrowAtTen } from "./Timeline";

/** A task on its own (CRM → Tasks): what, when, for whom, and optionally a client or deal */
export function TaskDialog({
  open,
  onOpenChange,
  options,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: CrmOptionsWithMe;
  /** Called with who the task is for (null = me) */
  onSaved: (ownerUserId: string | null) => void;
}) {
  const [subject, setSubject] = useState("");
  const [due, setDue] = useState(tomorrowAtTen);
  const [owner, setOwner] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [dealId, setDealId] = useState("");
  const [clients, setClients] = useState<Organisation[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject("");
    setDue(tomorrowAtTen());
    setOwner("");
    setOrganisationId("");
    setDealId("");
    setError(null);
    api<Organisation[]>("/api/crm/organisations").then(setClients).catch(() => undefined);
    api<Deal[]>("/api/crm/deals").then(setDeals).catch(() => undefined);
  }, [open]);

  const dealChoices = organisationId ? deals.filter((d) => d.organisation?.id === organisationId) : deals;

  const chooseDeal = (id: string) => {
    const deal = deals.find((d) => d.id === id);
    setDealId(id);
    if (deal?.organisation) setOrganisationId(deal.organisation.id);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/crm/activities", {
        method: "POST",
        json: {
          type: "task",
          subject: subject.trim(),
          due_at: new Date(due).toISOString(),
          owner_user_id: owner || null,
          organisation_id: organisationId || null,
          deal_id: dealId || null,
        },
      });
      onOpenChange(false);
      onSaved(owner || null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Talents see their tasks in the portal and get a notification; road managers see theirs on their dashboard.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <Field label="What needs doing">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Send the press shots" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due">
              <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <Field label="For">
              <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Me</option>
                <AssigneeOptions assignees={options.assignees} exclude={options.me} />
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client" hint="Optional">
              <select
                className={selectClass}
                value={organisationId}
                onChange={(e) => {
                  setOrganisationId(e.target.value);
                  setDealId("");
                }}
              >
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Deal" hint="Optional">
              <select className={selectClass} value={dealId} onChange={(e) => chooseDeal(e.target.value)}>
                <option value="">No deal</option>
                {dealChoices.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                    {deal.organisation && !organisationId ? ` (${deal.organisation.name})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !subject.trim() || !due} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
