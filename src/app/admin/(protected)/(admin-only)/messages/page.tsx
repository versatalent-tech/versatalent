"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, Copy, FileDown, History, Instagram, Loader2, Mail, MessageSquare, Pencil, Plus, Star, Trash2, Undo2 } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage, selectClass } from "@/components/crm/shared";
import {
  MESSAGE_CHANNELS,
  QUEUES,
  QUEUE_KEYS,
  SAMPLE_VALUES,
  STAGES,
  STAGE_KEYS,
  fillTemplate,
  type MessageChannel,
  type MessageTemplate,
  type PromoEvent,
  type Queue,
  type Stage,
  type TicketMessageCandidate,
  type TicketMessageLogEntry,
} from "@/lib/messages/types";
import { instagramUrl } from "@/lib/tickets/types";

type Tab = Queue | "promote" | "templates" | "sent";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this", text);
    return false;
  }
}

/** Make (POST) or fetch (GET) an order's ticket PDF and save it on this computer */
async function downloadTicketPdf(orderId: string, method: "POST" | "GET") {
  const response = await fetch(`/api/admin/tickets/orders/${orderId}/pdf`, { method, credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Couldn't get the PDF");
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "VersaTalent-tickets.pdf";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const fill = (t: MessageTemplate | undefined, values: Record<string, string>) => ({
  subject: t?.subject ? fillTemplate(t.subject, values) : null,
  body: t ? fillTemplate(t.body, values) : "",
});
const asText = (m: { subject: string | null; body: string }) => (m.subject ? `${m.subject}\n\n${m.body}` : m.body);

function CopyButton({ text, label = "Copy", size = "sm" as const }: { text: string; label?: string; size?: "sm" }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size={size}
      variant="outline"
      onClick={async () => {
        await copyText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function TemplateDialog({ template, stage, onClose, onSaved }: { template: MessageTemplate | null; stage: Stage; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    stage: template?.stage ?? stage,
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    is_default: template?.is_default ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const def = STAGES[form.stage];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const json = { ...form, subject: form.subject.trim() || null };
      await api(template ? `/api/admin/messages/templates/${template.id}` : "/api/admin/messages/templates", { method: template ? "PUT" : "POST", json });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const preview = fill({ ...(template as MessageTemplate), subject: form.subject || null, body: form.body }, SAMPLE_VALUES);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            Placeholders are filled in for you: {def.placeholders.map((p) => `{${p}}`).join(" ")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Stage</span>
              <select className={selectClass} value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as Stage }))}>
                {STAGE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {STAGES[k].title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Name</span>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Confirmation email" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Subject (leave blank for a DM, text or caption)</span>
            <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Message</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={10}
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} className="h-4 w-4 accent-[#D4AF37]" />
            Pick this one first for &ldquo;{def.title}&rdquo;
          </label>
          <details className="text-sm" open>
            <summary className="cursor-pointer text-gray-500">Preview with example details</summary>
            {preview.subject && <p className="mt-2 font-medium">{preview.subject}</p>}
            <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 font-sans text-gray-700">{preview.body}</pre>
          </details>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesPanel({ templates, onChanged }: { templates: MessageTemplate[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<{ template: MessageTemplate | null; stage: Stage } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (t: MessageTemplate) => {
    if (!window.confirm(`Delete the template "${t.name}"?`)) return;
    try {
      await api(`/api/admin/messages/templates/${t.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const makeDefault = async (t: MessageTemplate) => {
    try {
      await api(`/api/admin/messages/templates/${t.id}`, { method: "PUT", json: { stage: t.stage, name: t.name, subject: t.subject, body: t.body, is_default: true } });
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const duplicate = async (t: MessageTemplate) => {
    try {
      await api("/api/admin/messages/templates", { method: "POST", json: { stage: t.stage, name: `${t.name} (copy)`, subject: t.subject, body: t.body } });
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {STAGE_KEYS.map((stage) => {
        const list = templates.filter((t) => t.stage === stage);
        return (
          <section key={stage} className="space-y-2 rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{STAGES[stage].title}</h2>
                <p className="text-xs text-gray-500">{STAGES[stage].hint}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing({ template: null, stage })}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-gray-500">No templates yet.</p>
            ) : (
              <ul className="divide-y">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between">
                    <details className="min-w-0 flex-1 text-sm">
                      <summary className="cursor-pointer">
                        <span className="font-medium">{t.name}</span>
                        {t.is_default && <span className="ml-2 rounded bg-gold/20 px-2 py-0.5 text-xs text-amber-900">Picked first</span>}
                        <span className="ml-2 text-xs text-gray-500">{t.subject ? "Email" : "Short message"}</span>
                      </summary>
                      {t.subject && <p className="mt-2 font-medium">{t.subject}</p>}
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 font-sans text-gray-700">{t.body}</pre>
                    </details>
                    <div className="flex flex-shrink-0 flex-wrap gap-1">
                      {!t.is_default && (
                        <Button size="sm" variant="ghost" onClick={() => makeDefault(t)} title="Pick this one first">
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => duplicate(t)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ template: t, stage })} aria-label={`Edit ${t.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-700" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {editing && (
        <TemplateDialog
          template={editing.template}
          stage={editing.stage}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticket buyer queues
// ---------------------------------------------------------------------------

function CandidateRow({
  c,
  queue,
  templates,
  selected,
  onSelect,
  onMark,
}: {
  c: TicketMessageCandidate;
  queue: Queue;
  templates: MessageTemplate[];
  selected: boolean;
  onSelect: (on: boolean) => void;
  onMark: (channel: MessageChannel, templateId: string | null) => void;
}) {
  const stages = QUEUES[queue].stages;
  const options = templates.filter((t) => stages.includes(t.stage));
  const suggested = options.find((t) => t.stage === c.suggested_stage && t.is_default) ?? options.find((t) => t.stage === c.suggested_stage) ?? options[0];
  const [templateId, setTemplateId] = useState(suggested?.id ?? "");
  const [pdfMade, setPdfMade] = useState(c.has_pdf);
  const [busy, setBusy] = useState(false);
  const template = options.find((t) => t.id === templateId) ?? suggested;
  const msg = fill(template, c.values);

  const pdf = async (method: "POST" | "GET") => {
    setBusy(true);
    try {
      await downloadTicketPdf(c.order_id, method);
      setPdfMade(true);
    } catch (err) {
      window.alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <input type="checkbox" aria-label={`Select ${c.name}`} checked={selected} onChange={(e) => onSelect(e.target.checked)} className="mt-1 h-4 w-4 flex-shrink-0 accent-[#D4AF37]" />
          <div className="min-w-0 space-y-1">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {c.name}
              <a href={instagramUrl(c.instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-normal text-pink-700 hover:underline">
                <Instagram className="h-3.5 w-3.5" />@{c.instagram}
              </a>
              {queue === "follow_up" && (
                <span className={`rounded px-2 py-0.5 text-xs font-normal ${c.attended ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {c.attended ? "Came" : "Not scanned in"}
                </span>
              )}
              {c.marketing_consent && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-800">✓ marketing</span>}
            </p>
            <p className="text-sm text-gray-700">
              {c.tickets} · {c.event_title}
              {c.event_starts_at ? ` · ${format(new Date(c.event_starts_at), "EEE d MMM HH:mm")}` : ""}
            </p>
            <p className="truncate text-xs text-gray-500">
              {c.reference} · {c.email}
              {c.phone ? ` · ${c.phone}` : ""}
            </p>
          </div>
        </div>
        {queue === "confirmation" && (
          <div className="flex flex-shrink-0 flex-wrap gap-1">
            {pdfMade ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => pdf("GET")}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
                Download PDF
              </Button>
            ) : (
              <Button size="sm" className="bg-gold text-black hover:bg-gold/90" disabled={busy} onClick={() => pdf("POST")}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
                Create PDF
              </Button>
            )}
          </div>
        )}
      </div>

      {queue === "confirmation" && !pdfMade ? (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Create the PDF first: the message appears here once it&apos;s made, ready to send with the PDF attached.</p>
      ) : (
        <>
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-500">
              Message: <span className="text-gray-800">{template?.name ?? "no template"}</span>
            </summary>
            {msg.subject && <p className="mt-2 font-medium">{msg.subject}</p>}
            <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 font-sans text-gray-700">{msg.body}</pre>
          </details>
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${selectClass} w-auto`} value={template?.id ?? ""} onChange={(e) => setTemplateId(e.target.value)} aria-label="Template">
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {STAGES[t.stage].title}: {t.name}
                </option>
              ))}
            </select>
            <CopyButton text={asText(msg)} label="Copy message" />
            <Button size="sm" variant="outline" asChild>
              <a href={`mailto:${c.email}?subject=${encodeURIComponent(msg.subject ?? c.event_title)}&body=${encodeURIComponent(msg.body)}`}>
                <Mail className="mr-1 h-4 w-4" /> Email
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await copyText(msg.body);
                window.open(`https://ig.me/m/${encodeURIComponent(c.instagram)}`, "_blank", "noopener");
              }}
              title="Copies the message and opens an Instagram DM: paste it in"
            >
              <Instagram className="mr-1 h-4 w-4" /> DM
            </Button>
            {c.phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`sms:${c.phone}?&body=${encodeURIComponent(msg.body)}`}>
                  <MessageSquare className="mr-1 h-4 w-4" /> Text
                </a>
              </Button>
            )}
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <Button size="sm" className="bg-gold text-black hover:bg-gold/90" onClick={() => onMark("email", template?.id ?? null)}>
              Sent by email
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMark("instagram", template?.id ?? null)}>
              Sent by DM
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => onMark("skipped", null)}>
              Skip
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

interface QueueData {
  queue: Queue;
  counts: Record<Queue, number>;
  candidates: TicketMessageCandidate[];
}

function QueuePanel({
  queue,
  data,
  templates,
  loading,
  onMarked,
  onNotice,
  onError,
}: {
  queue: Queue;
  data: QueueData | null;
  templates: MessageTemplate[];
  loading: boolean;
  onMarked: (notice: string) => void;
  onNotice: (notice: string) => void;
  onError: (message: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<MessageChannel>("email");
  useEffect(() => setSelected(new Set()), [queue, data]);

  const mark = async (orderIds: string[], how: MessageChannel, templateId: string | null) => {
    if (orderIds.length === 0) return;
    try {
      const result = await api<{ recorded: number }>("/api/admin/messages/log", { method: "POST", json: { queue, channel: how, template_id: templateId, order_ids: orderIds } });
      onMarked(`${result.recorded} marked as ${how === "skipped" ? "skipped" : `sent (${MESSAGE_CHANNELS[how].toLowerCase()})`}.`);
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  if (!data || loading) return <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />;
  const candidates = data.candidates;
  const chosen = candidates.filter((c) => selected.has(c.order_id));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {QUEUES[queue].rule}
        {queue === "follow_up" && " Keep the message about the event; only add offers or other events for buyers marked ✓ marketing."}
      </p>
      {candidates.length === 0 ? (
        <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Nobody to message right now.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={chosen.length === candidates.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(candidates.map((c) => c.order_id)) : new Set())}
                className="h-4 w-4 accent-[#D4AF37]"
              />
              Select all ({candidates.length})
            </label>
            <span className="mx-2 h-5 w-px bg-gray-200" />
            <Button
              size="sm"
              variant="outline"
              disabled={chosen.length === 0}
              onClick={async () => {
                await copyText(Array.from(new Set(chosen.map((c) => c.email))).join(", "));
                onNotice(`Copied ${chosen.length} email addresses. Paste them into BCC.`);
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy emails for BCC
            </Button>
            <select className={`${selectClass} w-auto`} value={channel} onChange={(e) => setChannel(e.target.value as MessageChannel)} aria-label="How it was sent">
              {Object.entries(MESSAGE_CHANNELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <Button size="sm" disabled={chosen.length === 0} className="bg-gold text-black hover:bg-gold/90" onClick={() => mark(chosen.map((c) => c.order_id), channel, null)}>
              Mark {chosen.length || ""} as {channel === "skipped" ? "skipped" : "sent"}
            </Button>
          </div>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <CandidateRow
                key={c.order_id}
                c={c}
                queue={queue}
                templates={templates}
                selected={selected.has(c.order_id)}
                onSelect={(on) =>
                  setSelected((s) => {
                    const next = new Set(s);
                    if (on) next.add(c.order_id);
                    else next.delete(c.order_id);
                    return next;
                  })
                }
                onMark={(how, templateId) => mark([c.order_id], how, templateId)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------

function PromotePanel({ templates }: { templates: MessageTemplate[] }) {
  const [events, setEvents] = useState<Omit<PromoEvent, "past_buyer_emails">[] | null>(null);
  const [eventId, setEventId] = useState("");
  const [emails, setEmails] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const promos = templates.filter((t) => t.stage === "promotion" || t.stage === "general");
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    api<{ events: Omit<PromoEvent, "past_buyer_emails">[] }>("/api/admin/messages/promo")
      .then((d) => {
        setEvents(d.events);
        setEventId((cur) => cur || d.events[0]?.id || "");
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);
  useEffect(() => {
    if (!eventId) return;
    setEmails(null);
    api<{ past_buyer_emails: string[] }>(`/api/admin/messages/promo?event=${eventId}`)
      .then((d) => setEmails(d.past_buyer_emails))
      .catch((err) => setError(errorMessage(err)));
  }, [eventId]);

  const event = events?.find((e) => e.id === eventId);
  const template = promos.find((t) => t.id === templateId) ?? promos.find((t) => t.stage === "promotion" && t.is_default) ?? promos[0];
  const msg = event ? fill(template, event.values) : null;

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!events) return <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />;
  if (events.length === 0) return <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">No upcoming events to promote.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Pick an event and a template: the details are filled in, ready to post or send. Add more in Templates under &ldquo;Promotion&rdquo;.</p>
      <div className="flex flex-wrap gap-2">
        <select className={`${selectClass} w-auto`} value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Event">
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {format(new Date(e.starts_at), "d MMM yyyy")} · {e.title}
            </option>
          ))}
        </select>
        <select className={`${selectClass} w-auto`} value={template?.id ?? ""} onChange={(e) => setTemplateId(e.target.value)} aria-label="Template">
          {promos.map((t) => (
            <option key={t.id} value={t.id}>
              {STAGES[t.stage].title}: {t.name}
            </option>
          ))}
        </select>
      </div>
      {msg && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          {msg.subject && (
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{msg.subject}</p>
              <CopyButton text={msg.subject} label="Copy subject" />
            </div>
          )}
          <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 font-sans text-sm text-gray-700">{msg.body}</pre>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={msg.body} label="Copy message" />
            {msg.subject && <CopyButton text={asText(msg)} label="Copy subject and message" />}
          </div>
        </div>
      )}
      <div className="space-y-2 rounded-lg border bg-white p-4">
        <p className="font-semibold">Invite past ticket buyers</p>
        <p className="text-sm text-gray-600">
          People who bought tickets before, agreed to marketing emails on their latest order, and haven&apos;t bought for this event yet.
        </p>
        {emails === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : emails.length === 0 ? (
          <p className="text-sm text-gray-500">Nobody yet.</p>
        ) : (
          <CopyButton text={emails.join(", ")} label={`Copy ${emails.length} email${emails.length === 1 ? "" : "s"} for BCC`} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sent
// ---------------------------------------------------------------------------

function SentPanel() {
  const [rows, setRows] = useState<TicketMessageLogEntry[] | null>(null);
  const load = useCallback(() => {
    api<TicketMessageLogEntry[]>("/api/admin/messages/log").then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);
  const undo = async (r: TicketMessageLogEntry) => {
    if (!window.confirm(`Undo "${QUEUES[r.queue].title}" for ${r.name}? They go back on the list.`)) return;
    try {
      await api(`/api/admin/messages/log?id=${r.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };
  if (!rows) return <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-gold" />;
  if (rows.length === 0) return <p className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">Nothing sent yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Buyer</th>
            <th className="px-3 py-2">Message</th>
            <th className="px-3 py-2">How</th>
            <th className="px-3 py-2">By</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="whitespace-nowrap px-3 py-2">{format(new Date(r.created_at), "d MMM HH:mm")}</td>
              <td className="px-3 py-2">
                {r.name}
                <span className="block text-xs text-gray-500">
                  {r.reference} · {r.event_title}
                </span>
              </td>
              <td className="px-3 py-2">
                {QUEUES[r.queue]?.title ?? r.queue}
                {r.template_name ? <span className="block text-xs text-gray-500">{r.template_name}</span> : null}
              </td>
              <td className="px-3 py-2">{MESSAGE_CHANNELS[r.channel] ?? r.channel}</td>
              <td className="px-3 py-2 text-gray-500">{r.sent_by_name ?? "–"}</td>
              <td className="px-3 py-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => undo(r)} aria-label="Undo">
                  <Undo2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function CustomerMessagesPage() {
  const [tab, setTab] = useState<Tab>("confirmation");
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queue: Queue = (QUEUE_KEYS as readonly string[]).includes(tab) ? (tab as Queue) : data?.queue ?? "confirmation";

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await api<MessageTemplate[]>("/api/admin/messages/templates"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  const loadQueue = useCallback(async (q: Queue) => {
    setLoading(true);
    try {
      setData(await api<QueueData>(`/api/admin/messages?queue=${q}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);
  useEffect(() => {
    if ((QUEUE_KEYS as readonly string[]).includes(tab)) loadQueue(tab as Queue);
  }, [tab, loadQueue]);

  const tabs = useMemo(
    () =>
      [
        ...QUEUE_KEYS.map((k) => [k, QUEUES[k].title, data?.counts[k] ?? 0] as const),
        ["promote", "Promote an event", 0] as const,
        ["templates", "Templates", 0] as const,
      ] as const,
    [data]
  );

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Customer <span className="text-gold">messages</span>
          </h1>
          <p className="text-gray-300">Messages for ticket buyers and for promoting events. Send them yourself, then mark them sent so nobody gets one twice.</p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setNotice(null);
                }}
                className={`rounded-full border px-3 py-1 text-sm ${tab === key ? "border-black bg-black text-white" : "bg-white text-gray-700"}`}
              >
                {label}
                {count > 0 ? <span className="ml-1 rounded-full bg-gold px-1.5 text-xs font-semibold text-black">{count}</span> : null}
              </button>
            ))}
            <button
              onClick={() => setTab("sent")}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${tab === "sent" ? "border-black bg-black text-white" : "bg-white text-gray-700"}`}
            >
              <History className="h-3.5 w-3.5" /> Sent
            </button>
          </div>

          {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {!templates ? (
            !error && <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : tab === "templates" ? (
            <TemplatesPanel templates={templates} onChanged={loadTemplates} />
          ) : tab === "promote" ? (
            <PromotePanel templates={templates} />
          ) : tab === "sent" ? (
            <SentPanel />
          ) : (
            <QueuePanel
              queue={queue}
              data={data?.queue === queue ? data : null}
              templates={templates}
              loading={loading}
              onMarked={(message) => {
                setNotice(message);
                loadQueue(queue);
              }}
              onNotice={setNotice}
              onError={setError}
            />
          )}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
