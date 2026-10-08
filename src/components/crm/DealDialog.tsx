"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CRM_CURRENCIES,
  DEAL_SOURCES,
  DEAL_STAGES,
  type Contact,
  type Deal,
  type DealSource,
  type DealStage,
  type Organisation,
} from "@/lib/crm/types";
import { api, errorMessage, Field, parseMoney, selectClass, TalentPicker, type CrmOptionsWithMe } from "./shared";

const NEW_CLIENT = "__new__";

interface DealForm {
  title: string;
  organisation_id: string;
  new_client_name: string;
  contact_id: string;
  stage: DealStage;
  value: string;
  currency: string;
  expected_close: string;
  source: DealSource;
  talent_ids: string[];
  owner_user_id: string;
  lost_reason: string;
  notes: string;
}

function toForm(deal: Deal | null, defaults: { organisationId?: string; me: string | null }): DealForm {
  return {
    title: deal?.title ?? "",
    organisation_id: deal?.organisation?.id ?? defaults.organisationId ?? "",
    new_client_name: "",
    contact_id: deal?.contact?.id ?? "",
    stage: deal?.stage ?? "lead",
    value: deal?.value_cents != null ? String(deal.value_cents / 100) : "",
    currency: deal?.currency ?? "GBP",
    expected_close: deal?.expected_close ?? "",
    source: deal?.source ?? "other",
    talent_ids: deal?.talents.map((t) => t.id) ?? [],
    owner_user_id: deal?.owner?.id ?? defaults.me ?? "",
    lost_reason: deal?.lost_reason ?? "",
    notes: deal?.notes ?? "",
  };
}

export function DealDialog({
  open,
  onOpenChange,
  deal,
  options,
  defaultOrganisationId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null; // null = new deal
  options: CrmOptionsWithMe;
  defaultOrganisationId?: string;
  onSaved: (deal: Deal) => void;
}) {
  const [form, setForm] = useState<DealForm>(() => toForm(deal, { organisationId: defaultOrganisationId, me: options.me }));
  const [clients, setClients] = useState<Organisation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(deal, { organisationId: defaultOrganisationId, me: options.me }));
    setError(null);
    api<Organisation[]>("/api/crm/organisations").then(setClients).catch(() => undefined);
  }, [open, deal, defaultOrganisationId, options.me]);

  // Contacts of the chosen client (or everyone, when no client)
  useEffect(() => {
    if (!open || form.organisation_id === NEW_CLIENT) {
      setContacts([]);
      return;
    }
    const query = form.organisation_id ? `?organisationId=${form.organisation_id}` : "";
    api<Contact[]>(`/api/crm/contacts${query}`).then(setContacts).catch(() => undefined);
  }, [open, form.organisation_id]);

  const set = <K extends keyof DealForm>(key: K, value: DealForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setError(null);
    const value_cents = parseMoney(form.value);
    if (value_cents === undefined) {
      setError("Enter the value as a number, e.g. 1500");
      return;
    }
    setSaving(true);
    try {
      let organisationId: string | null = form.organisation_id || null;
      if (organisationId === NEW_CLIENT) {
        if (!form.new_client_name.trim()) throw new Error("Enter the new client's name");
        const created = await api<Organisation>("/api/crm/organisations", {
          method: "POST",
          json: { name: form.new_client_name, type: "brand" },
        });
        organisationId = created.id;
      }

      const payload = {
        title: form.title,
        organisation_id: organisationId,
        contact_id: form.contact_id || null,
        stage: form.stage,
        value_cents,
        currency: form.currency,
        expected_close: form.expected_close || null,
        source: form.source,
        talent_ids: form.talent_ids,
        owner_user_id: form.owner_user_id || null,
        lost_reason: form.stage === "lost" ? form.lost_reason : null,
        notes: form.notes,
      };
      const saved = deal
        ? await api<Deal>(`/api/crm/deals/${deal.id}`, { method: "PATCH", json: payload })
        : await api<Deal>("/api/crm/deals", { method: "POST", json: payload });
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
          <DialogTitle>{deal ? "Edit deal" : "New deal"}</DialogTitle>
          <DialogDescription>A potential booking or partnership, from first contact to won or lost.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Summer launch party DJ set" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <select
                className={selectClass}
                value={form.organisation_id}
                onChange={(e) => setForm((f) => ({ ...f, organisation_id: e.target.value, contact_id: "" }))}
              >
                <option value="">No client yet</option>
                <option value={NEW_CLIENT}>+ New client…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            {form.organisation_id === NEW_CLIENT ? (
              <Field label="New client name">
                <Input value={form.new_client_name} onChange={(e) => set("new_client_name", e.target.value)} />
              </Field>
            ) : (
              <Field label="Contact person">
                <select className={selectClass} value={form.contact_id} onChange={(e) => set("contact_id", e.target.value)}>
                  <option value="">None</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.organisation && !form.organisation_id ? ` (${contact.organisation.name})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Stage">
              <select className={selectClass} value={form.stage} onChange={(e) => set("stage", e.target.value as DealStage)}>
                {DEAL_STAGES.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Value (what the client pays)">
              <div className="flex gap-2">
                <select className={`${selectClass} w-24`} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CRM_CURRENCIES.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
                <Input inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="0" />
              </div>
            </Field>
            <Field label="Expected to close">
              <Input type="date" value={form.expected_close} onChange={(e) => set("expected_close", e.target.value)} />
            </Field>
          </div>

          {form.stage === "lost" && (
            <Field label="Why was it lost?">
              <Input value={form.lost_reason} onChange={(e) => set("lost_reason", e.target.value)} placeholder="e.g. budget, dates, went elsewhere" />
            </Field>
          )}

          <Field label="Talents involved">
            <TalentPicker talents={options.talents} value={form.talent_ids} onChange={(ids) => set("talent_ids", ids)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source">
              <select className={selectClass} value={form.source} onChange={(e) => set("source", e.target.value as DealSource)}>
                {Object.entries(DEAL_SOURCES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Owner">
              <select className={selectClass} value={form.owner_user_id} onChange={(e) => set("owner_user_id", e.target.value)}>
                <option value="">Unassigned</option>
                {options.owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                    {owner.id === options.me ? " (me)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deal ? "Save changes" : "Create deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
