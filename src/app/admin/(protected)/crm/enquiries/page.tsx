"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Archive, ArrowRight, Inbox, Loader2, Mail, Phone, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ENQUIRY_FORMS, ORG_TYPES, type Enquiry, type EnquiryStatus, type OrgType } from "@/lib/crm/types";
import { CrmShell, Field, TalentPicker, api, errorMessage, parseMoney, selectClass, useCrmOptions } from "@/components/crm/shared";

type Filter = EnquiryStatus | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "new", label: "New" },
  { key: "converted", label: "Converted" },
  { key: "archived", label: "Archived" },
  { key: "spam", label: "Spam" },
  { key: "all", label: "All" },
];

const FORM_STYLES = {
  contact: "bg-sky-100 text-sky-800",
  brand: "bg-amber-100 text-amber-800",
  talent: "bg-purple-100 text-purple-800",
};

function ConvertDialog({
  enquiry,
  onClose,
}: {
  enquiry: Enquiry | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const options = useCrmOptions();
  const [title, setTitle] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationType, setOrganisationType] = useState<OrgType>("brand");
  const [talentIds, setTalentIds] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enquiry) return;
    setTitle(enquiry.subject || (enquiry.company ? `${enquiry.company} enquiry` : `Enquiry from ${enquiry.name ?? "website"}`));
    setOrganisationName(enquiry.company ?? "");
    setOrganisationType(enquiry.company ? "brand" : "private");
    setTalentIds([]);
    setValue("");
    setOwner(options.me ?? "");
    setError(null);
  }, [enquiry, options.me]);

  const convert = async () => {
    if (!enquiry) return;
    const value_cents = parseMoney(value);
    if (value_cents === undefined) {
      setError("Enter the estimated value as a number");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await api<{ dealId: string }>(`/api/crm/enquiries/${enquiry.id}/convert`, {
        method: "POST",
        json: {
          title,
          organisation_name: organisationName || null,
          organisation_type: organisationType,
          talent_ids: talentIds,
          value_cents,
          owner_user_id: owner || null,
        },
      });
      router.push(`/admin/crm/deals/${result.dealId}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open={enquiry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert to a deal</DialogTitle>
          <DialogDescription>
            Creates the client and contact (or reuses them if they already exist) and starts a deal at Lead. The original message is
            kept on the deal&apos;s timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <Field label="Deal title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" hint="Leave empty for a private individual">
              <Input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} />
            </Field>
            <Field label="Client type">
              <select className={selectClass} value={organisationType} onChange={(e) => setOrganisationType(e.target.value as OrgType)}>
                {Object.entries(ORG_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated value (£)">
              <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Owner">
              <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Unassigned</option>
                {options.owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Talents they're interested in">
            <TalentPicker talents={options.talents} value={talentIds} onChange={setTalentIds} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={convert} disabled={saving || !title.trim()} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EnquiriesPage() {
  const [filter, setFilter] = useState<Filter>("new");
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<Record<EnquiryStatus, number>>({ new: 0, converted: 0, archived: 0, spam: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [converting, setConverting] = useState<Enquiry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ enquiries: Enquiry[]; counts: Record<EnquiryStatus, number> }>(`/api/crm/enquiries?status=${filter}`);
      setEnquiries(data.enquiries);
      setCounts(data.counts);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (enquiry: Enquiry, status: "new" | "archived" | "spam") => {
    try {
      await api(`/api/crm/enquiries/${enquiry.id}`, { method: "PATCH", json: { status } });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <CrmShell
      title={
        <>
          Enquiries <span className="text-gold">Inbox</span>
        </>
      }
      subtitle="Messages from the website's contact, brand and talent forms."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-black bg-black text-white" : "bg-white text-gray-600"}`}
          >
            {f.label}
            {f.key !== "all" && counts[f.key] > 0 ? ` (${counts[f.key]})` : ""}
          </button>
        ))}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {!loading && enquiries.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-gray-500">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          {filter === "new" ? "Inbox zero. New website enquiries will appear here." : "Nothing here."}
        </div>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((enquiry) => {
            const isOpen = expanded === enquiry.id;
            return (
              <li key={enquiry.id} className="rounded-lg border bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? null : enquiry.id)}
                  className="flex w-full items-start justify-between gap-4 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${FORM_STYLES[enquiry.form]}`}>{ENQUIRY_FORMS[enquiry.form]}</span>
                      <span className="font-medium">{enquiry.name ?? enquiry.email ?? "Unknown"}</span>
                      {enquiry.company && <span className="text-sm text-gray-500">· {enquiry.company}</span>}
                    </div>
                    <p className="truncate text-sm text-gray-600">{enquiry.subject || enquiry.message || "(no message)"}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400" title={format(new Date(enquiry.created_at), "PPpp")}>
                    {formatDistanceToNow(new Date(enquiry.created_at), { addSuffix: true })}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t px-4 pb-4 pt-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {enquiry.email && (
                        <a href={`mailto:${enquiry.email}`} className="flex items-center gap-1.5 text-gray-700 hover:text-gold">
                          <Mail className="h-4 w-4" /> {enquiry.email}
                        </a>
                      )}
                      {enquiry.phone && (
                        <a href={`tel:${enquiry.phone}`} className="flex items-center gap-1.5 text-gray-700 hover:text-gold">
                          <Phone className="h-4 w-4" /> {enquiry.phone}
                        </a>
                      )}
                    </div>
                    {enquiry.subject && <p className="text-sm font-medium">{enquiry.subject}</p>}
                    {enquiry.message && <p className="whitespace-pre-wrap text-sm text-gray-700">{enquiry.message}</p>}

                    {enquiry.status === "converted" && enquiry.deal && (
                      <Link href={`/admin/crm/deals/${enquiry.deal.id}`} className="inline-flex items-center gap-1 text-sm text-gold underline">
                        Converted to “{enquiry.deal.name}” <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    {enquiry.handled_by_name && enquiry.status !== "new" && (
                      <p className="text-xs text-gray-400">Handled by {enquiry.handled_by_name}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {enquiry.status !== "converted" && enquiry.form !== "talent" && (
                        <Button size="sm" onClick={() => setConverting(enquiry)} className="bg-gold text-black hover:bg-gold/90">
                          Convert to deal
                        </Button>
                      )}
                      {enquiry.status === "new" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setStatus(enquiry, "archived")}>
                            <Archive className="mr-1.5 h-4 w-4" /> Archive
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(enquiry, "spam")}>
                            <ShieldAlert className="mr-1.5 h-4 w-4" /> Spam
                          </Button>
                        </>
                      )}
                      {(enquiry.status === "archived" || enquiry.status === "spam") && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(enquiry, "new")}>
                          <RotateCcw className="mr-1.5 h-4 w-4" /> Back to inbox
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConvertDialog enquiry={converting} onClose={() => setConverting(null)} />
    </CrmShell>
  );
}
