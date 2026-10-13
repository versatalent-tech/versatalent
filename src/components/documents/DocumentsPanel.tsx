"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, isBefore, parseISO } from "date-fns";
import { FileText, Loader2, Lock, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_KINDS,
  EXPIRING_KINDS,
  EXPIRY_WARNING_DAYS,
  KINDS_FOR,
  MAX_DOCUMENT_BYTES,
  SENSITIVE_KINDS,
  formatBytes,
  type DocumentItem,
  type DocumentKind,
  type DocumentOwnerType,
} from "@/lib/documents/types";
import { api, errorMessage, selectClass } from "@/components/crm/shared";

type Owner = { bookingId: string } | { dealId: string } | { talentId: string };

interface Listing {
  documents: DocumentItem[];
  can_edit: boolean;
  is_admin: boolean;
}

function ownerParam(owner: Owner): string {
  if ("bookingId" in owner) return `bookingId=${owner.bookingId}`;
  if ("dealId" in owner) return `dealId=${owner.dealId}`;
  return `talentId=${owner.talentId}`;
}

function ownerTypeOf(owner: Owner): DocumentOwnerType {
  return "bookingId" in owner ? "booking" : "dealId" in owner ? "deal" : "talent";
}

/** A year from today, as YYYY-MM-DD: the default date to delete an ID document by */
function inAYear(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function expiryLabel(doc: DocumentItem): { text: string; urgent: boolean } | null {
  if (!doc.expires_on) return null;
  const expires = parseISO(doc.expires_on);
  const soon = new Date(Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);
  if (isBefore(expires, new Date())) return { text: `Expired ${format(expires, "d MMM yyyy")}`, urgent: true };
  return { text: `Expires ${format(expires, "d MMM yyyy")}`, urgent: isBefore(expires, soon) };
}

/**
 * A booking's, deal's or talent's documents. Everyone it's shown to can
 * download what the API lets them see; people who may change them can also
 * upload, change the kind and dates, share with the talent (bookings and
 * profiles) and delete. Admin-only documents are for admins.
 */
export function DocumentsPanel({ owner }: { owner: Owner }) {
  const type = ownerTypeOf(owner);
  const kinds = KINDS_FOR[type];
  const query = ownerParam(owner);
  const [listing, setListing] = useState<Listing | null>(null);
  const [kind, setKind] = useState<DocumentKind>(type === "deal" ? "contract" : type === "talent" ? "agreement" : "rider");
  const [share, setShare] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [expiresOn, setExpiresOn] = useState("");
  const [deleteAfter, setDeleteAfter] = useState(inAYear);
  const [busy, setBusy] = useState<string | null>(null); // "upload" or a document id
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<Listing>(`/api/documents?${query}`)
      .then(setListing)
      .catch((err) => setError(errorMessage(err)));
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = listing?.can_edit ?? false;
  const isAdmin = listing?.is_admin ?? false;
  const offeredKinds = kinds.filter((k) => isAdmin || !SENSITIVE_KINDS.includes(k));
  const sensitive = SENSITIVE_KINDS.includes(kind);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(`Files can be up to ${formatBytes(MAX_DOCUMENT_BYTES)}`);
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    const [key, value] = query.split("=");
    form.set(key, value);
    if (type !== "deal") form.set("visible_to_talent", String(share));
    if (isAdmin) form.set("admin_only", String(adminOnly || sensitive));
    if (EXPIRING_KINDS.includes(kind) && expiresOn) form.set("expires_on", expiresOn);
    if (sensitive) form.set("delete_after", deleteAfter);
    setBusy("upload");
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) throw new Error(body.error || "Upload failed");
      setExpiresOn("");
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const update = async (doc: DocumentItem, changes: Partial<Pick<DocumentItem, "kind" | "visible_to_talent" | "admin_only" | "is_public" | "expires_on" | "delete_after">>) => {
    setBusy(doc.id);
    setError(null);
    try {
      const updated = await api<DocumentItem>(`/api/documents/${doc.id}`, { method: "PATCH", json: changes });
      setListing((l) => l && { ...l, documents: l.documents.map((d) => (d.id === doc.id ? updated : d)) });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (doc: DocumentItem) => {
    if (!window.confirm(`Delete “${doc.filename}”?`)) return;
    setBusy(doc.id);
    setError(null);
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      setListing((l) => l && { ...l, documents: l.documents.filter((d) => d.id !== doc.id) });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</div>}

      {listing === null ? (
        !error && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : listing.documents.length === 0 ? (
        <p className="text-sm text-gray-500">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {listing.documents.map((doc) => {
            const editable = canEdit && !doc.from_talent_profile && (!doc.admin_only || isAdmin);
            const expiry = expiryLabel(doc);
            return (
              <li key={doc.id} className="rounded-md border bg-white p-2.5">
                <div className="flex items-start gap-2">
                  {doc.admin_only ? (
                    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-label="Admins only" />
                  ) : (
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <a href={`/api/documents/${doc.id}`} className="block truncate text-sm font-medium hover:text-gold hover:underline">
                      {doc.filename}
                    </a>
                    <p className="text-xs text-gray-500">
                      {editable ? "" : `${DOCUMENT_KINDS[doc.kind]} · `}
                      {doc.from_talent_profile ? "From the talent's profile · " : ""}
                      {formatBytes(doc.size_bytes)} · {format(new Date(doc.created_at), "d MMM yyyy")}
                      {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ""}
                      {doc.admin_only ? " · Admins only" : ""}
                      {doc.is_public ? " · Public press kit" : ""}
                    </p>
                    {expiry && <p className={`text-xs ${expiry.urgent ? "font-medium text-red-700" : "text-gray-500"}`}>{expiry.text}</p>}
                    {doc.delete_after && (
                      <p className={`text-xs ${isBefore(parseISO(doc.delete_after), new Date()) ? "font-medium text-red-700" : "text-gray-500"}`}>
                        Delete by {format(parseISO(doc.delete_after), "d MMM yyyy")}
                      </p>
                    )}
                  </div>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => remove(doc)}
                      disabled={busy === doc.id}
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {editable && (
                  <div className="ml-6 mt-2 flex flex-wrap items-center gap-3">
                    <select
                      id={`doc-kind-${doc.id}`}
                      className={`${selectClass} h-8 w-auto text-xs`}
                      value={doc.kind}
                      onChange={(e) => update(doc, { kind: e.target.value as DocumentKind })}
                      disabled={busy === doc.id}
                      aria-label="Kind"
                    >
                      {kinds
                        .filter((k) => isAdmin || !SENSITIVE_KINDS.includes(k) || k === doc.kind)
                        .map((k) => (
                          <option key={k} value={k}>
                            {DOCUMENT_KINDS[k]}
                          </option>
                        ))}
                    </select>
                    {EXPIRING_KINDS.includes(doc.kind) && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-600">
                        Expires
                        <Input
                          id={`doc-expires-${doc.id}`}
                          type="date"
                          className="h-8 w-auto text-xs"
                          value={doc.expires_on ?? ""}
                          onChange={(e) => update(doc, { expires_on: e.target.value || null })}
                          disabled={busy === doc.id}
                        />
                      </label>
                    )}
                    {SENSITIVE_KINDS.includes(doc.kind) && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-600">
                        Delete by
                        <Input
                          id={`doc-delete-after-${doc.id}`}
                          type="date"
                          className="h-8 w-auto text-xs"
                          value={doc.delete_after ?? ""}
                          onChange={(e) => e.target.value && update(doc, { delete_after: e.target.value })}
                          disabled={busy === doc.id}
                        />
                      </label>
                    )}
                    {type !== "deal" && (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <Switch
                          id={`doc-share-${doc.id}`}
                          checked={doc.visible_to_talent}
                          onCheckedChange={(checked) => update(doc, { visible_to_talent: checked })}
                          disabled={busy === doc.id}
                        />
                        Visible to the talent
                      </label>
                    )}
                    {type === "talent" && doc.kind === "comp_card" && !doc.admin_only && (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <Switch
                          id={`doc-public-${doc.id}`}
                          checked={doc.is_public}
                          onCheckedChange={(checked) => update(doc, { is_public: checked })}
                          disabled={busy === doc.id}
                        />
                        Public press kit (download on their public page)
                      </label>
                    )}
                    {isAdmin && !SENSITIVE_KINDS.includes(doc.kind) && (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <Switch
                          id={`doc-admin-${doc.id}`}
                          checked={doc.admin_only}
                          onCheckedChange={(checked) => update(doc, { admin_only: checked })}
                          disabled={busy === doc.id}
                        />
                        Admins only
                      </label>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div className="space-y-2 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              id={`doc-new-kind-${query}`}
              className={`${selectClass} h-9 w-auto`}
              value={kind}
              onChange={(e) => setKind(e.target.value as DocumentKind)}
              aria-label="Kind of document"
            >
              {offeredKinds.map((k) => (
                <option key={k} value={k}>
                  {DOCUMENT_KINDS[k]}
                </option>
              ))}
            </select>
            {EXPIRING_KINDS.includes(kind) && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                Expires
                <Input id={`doc-new-expires-${query}`} type="date" className="h-9 w-auto" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              </label>
            )}
            {sensitive && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                Delete by
                <Input id={`doc-new-delete-${query}`} type="date" className="h-9 w-auto" value={deleteAfter} onChange={(e) => setDeleteAfter(e.target.value)} />
              </label>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {type !== "deal" && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <Switch id={`doc-new-share-${query}`} checked={share} onCheckedChange={setShare} />
                Share with the talent
              </label>
            )}
            {isAdmin && !sensitive && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <Switch id={`doc-new-admin-${query}`} checked={adminOnly} onCheckedChange={setAdminOnly} />
                Admins only
              </label>
            )}
            <input
              ref={fileInput}
              id={`doc-file-${query}`}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={busy === "upload" || (sensitive && !deleteAfter)}
            >
              {busy === "upload" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              Upload
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            PDF, Word, Excel, text or image, up to {formatBytes(MAX_DOCUMENT_BYTES)}.
            {sensitive && " ID documents are personal data: only admins can see them, and they should be deleted by the date you set."}
            {type === "talent" && kind === "rider" && " Riders on a talent's profile also show on each of their bookings."}
          </p>
        </div>
      )}
    </div>
  );
}
