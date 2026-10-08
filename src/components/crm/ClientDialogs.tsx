"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ORG_TYPES, type Contact, type Organisation, type OrgType } from "@/lib/crm/types";
import { api, errorMessage, Field, selectClass, type CrmOptionsWithMe } from "./shared";

function useSaver<T>(onDone: (value: T) => void, close: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (request: () => Promise<T>) => {
    setSaving(true);
    setError(null);
    try {
      onDone(await request());
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, setError, run };
}

const EMPTY_ORG = { name: "", type: "brand" as OrgType, website: "", email: "", phone: "", city: "", country: "", notes: "", tags: "", owner_user_id: "" };

export function ClientDialog({
  open,
  onOpenChange,
  organisation,
  options,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: Organisation | null;
  options: CrmOptionsWithMe;
  onSaved: (organisation: Organisation) => void;
}) {
  const [form, setForm] = useState(EMPTY_ORG);
  const { saving, error, setError, run } = useSaver(onSaved, () => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      organisation
        ? {
            name: organisation.name,
            type: organisation.type,
            website: organisation.website ?? "",
            email: organisation.email ?? "",
            phone: organisation.phone ?? "",
            city: organisation.city ?? "",
            country: organisation.country ?? "",
            notes: organisation.notes ?? "",
            tags: organisation.tags.join(", "),
            owner_user_id: organisation.owner?.id ?? "",
          }
        : { ...EMPTY_ORG, owner_user_id: options.me ?? "" }
    );
  }, [open, organisation, options.me, setError]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = () =>
    run(() => {
      const json = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        owner_user_id: form.owner_user_id || null,
      };
      return organisation
        ? api<Organisation>(`/api/crm/organisations/${organisation.id}`, { method: "PATCH", json })
        : api<Organisation>("/api/crm/organisations", { method: "POST", json });
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{organisation ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>A brand, venue, promoter or private client you work with.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Type">
              <select className={selectClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
                {Object.entries(ORG_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Owner">
              <select className={selectClass} value={form.owner_user_id} onChange={(e) => set("owner_user_id", e.target.value)}>
                <option value="">Unassigned</option>
                {options.owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </Field>
          </div>
          <Field label="Tags" hint="Comma separated, e.g. fashion, Leeds, weddings">
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </Field>
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
            {organisation ? "Save" : "Add client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_CONTACT = {
  name: "",
  email: "",
  phone: "",
  job_title: "",
  organisation_id: "",
  lawful_basis: "legitimate_interest" as "legitimate_interest" | "consent",
  do_not_contact: false,
  notes: "",
};

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  organisations,
  defaultOrganisationId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  organisations: Pick<Organisation, "id" | "name">[];
  defaultOrganisationId?: string;
  onSaved: (contact: Contact) => void;
}) {
  const [form, setForm] = useState(EMPTY_CONTACT);
  const { saving, error, setError, run } = useSaver(onSaved, () => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      contact
        ? {
            name: contact.name,
            email: contact.email ?? "",
            phone: contact.phone ?? "",
            job_title: contact.job_title ?? "",
            organisation_id: contact.organisation?.id ?? "",
            lawful_basis: contact.lawful_basis,
            do_not_contact: contact.do_not_contact,
            notes: contact.notes ?? "",
          }
        : { ...EMPTY_CONTACT, organisation_id: defaultOrganisationId ?? "" }
    );
  }, [open, contact, defaultOrganisationId, setError]);

  const save = () =>
    run(() => {
      const json = { ...form, organisation_id: form.organisation_id || null };
      return contact
        ? api<Contact>(`/api/crm/contacts/${contact.id}`, { method: "PATCH", json })
        : api<Contact>("/api/crm/contacts", { method: "POST", json });
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "New contact"}</DialogTitle>
          <DialogDescription>A person you deal with.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Job title">
              <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Client">
            <select
              className={selectClass}
              value={form.organisation_id}
              onChange={(e) => setForm({ ...form, organisation_id: e.target.value })}
            >
              <option value="">None (private individual)</option>
              {organisations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Why we may contact them"
            hint="UK GDPR: business contacts at companies are usually legitimate interest; sole traders and private individuals need consent for marketing."
          >
            <select
              className={selectClass}
              value={form.lawful_basis}
              onChange={(e) => setForm({ ...form, lawful_basis: e.target.value as typeof form.lawful_basis })}
            >
              <option value="legitimate_interest">Legitimate interest (business contact)</option>
              <option value="consent">They gave consent</option>
            </select>
          </Field>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="text-sm font-medium">Do not contact</p>
              <p className="text-xs text-gray-500">They asked not to be contacted. Outreach will skip them.</p>
            </div>
            <Switch checked={form.do_not_contact} onCheckedChange={(checked) => setForm({ ...form, do_not_contact: checked })} />
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {contact ? "Save" : "Add contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
