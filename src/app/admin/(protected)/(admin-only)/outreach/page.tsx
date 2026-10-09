"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Copy, History, Loader2, Mail, MessageSquare, Pencil } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CAMPAIGNS,
  CAMPAIGN_KEYS,
  CHANNELS,
  PLACEHOLDERS,
  fillTemplate,
  type CampaignKey,
  type CampaignSettingsMap,
  type Channel,
  type OutreachCandidate,
  type OutreachLogEntry,
} from "@/lib/outreach/types";
import { api, errorMessage, selectClass } from "@/components/crm/shared";

interface Data {
  campaign: CampaignKey;
  settings: CampaignSettingsMap;
  counts: Record<CampaignKey, number>;
  candidates: OutreachCandidate[];
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this", text);
    return false;
  }
}

function TemplateDialog({ campaign, settings, onClose, onSaved }: { campaign: CampaignKey; settings: CampaignSettingsMap; onClose: () => void; onSaved: (s: CampaignSettingsMap) => void }) {
  const [subject, setSubject] = useState(settings[campaign].subject);
  const [body, setBody] = useState(settings[campaign].body);
  const [cooldown, setCooldown] = useState(String(settings[campaign].cooldown_days));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const def = CAMPAIGNS[campaign];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await api<CampaignSettingsMap>("/api/admin/outreach", {
          method: "PUT",
          json: { campaign, subject, body, ...(def.one_off ? {} : { cooldown_days: parseInt(cooldown, 10) || 0 }) },
        })
      );
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{def.title}: message</DialogTitle>
          <DialogDescription>
            Placeholders are filled in for each member: {PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Subject</span>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Message</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="w-full rounded-md border px-3 py-2 font-mono text-sm" />
          </label>
          {!def.one_off && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Don&apos;t list someone again for (days)</span>
              <Input value={cooldown} onChange={(e) => setCooldown(e.target.value)} inputMode="numeric" className="w-28" />
            </label>
          )}
          <div className="flex justify-between">
            <button
              type="button"
              className="text-xs text-gray-500 underline"
              onClick={() => {
                setSubject(def.default_subject);
                setBody(def.default_body);
              }}
            >
              Reset to the default text
            </button>
          </div>
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

function HistoryPanel() {
  const [rows, setRows] = useState<OutreachLogEntry[] | null>(null);
  useEffect(() => {
    api<OutreachLogEntry[]>("/api/admin/outreach/log").then(setRows).catch(() => setRows([]));
  }, []);
  if (!rows) return <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-gold" />;
  if (rows.length === 0) return <p className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">Nothing sent yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Member</th>
            <th className="px-3 py-2">Campaign</th>
            <th className="px-3 py-2">How</th>
            <th className="px-3 py-2">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="whitespace-nowrap px-3 py-2">{format(new Date(r.created_at), "d MMM HH:mm")}</td>
              <td className="px-3 py-2">{r.member.name}</td>
              <td className="px-3 py-2">{CAMPAIGNS[r.campaign]?.title ?? r.campaign}</td>
              <td className="px-3 py-2">
                {CHANNELS[r.channel]}
                {r.note ? <span className="block text-xs text-gray-500">{r.note}</span> : null}
              </td>
              <td className="px-3 py-2 text-gray-500">{r.sent_by_name ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OutreachPage() {
  const [campaign, setCampaign] = useState<CampaignKey>("founding_renewal");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<Channel>("email");
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Data>(`/api/admin/outreach?campaign=${campaign}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    setSelected(new Set());
    load();
  }, [load]);

  const settings = data?.settings[campaign];
  const def = CAMPAIGNS[campaign];
  const rowKey = (c: OutreachCandidate) => `${c.user_id}|${c.dedupe_key ?? ""}`;
  const message = (c: OutreachCandidate) => ({
    subject: fillTemplate(settings?.subject ?? "", c.values),
    body: fillTemplate(settings?.body ?? "", c.values),
  });

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const mark = async (entries: OutreachCandidate[], how: Channel) => {
    if (entries.length === 0) return;
    try {
      const result = await api<{ recorded: number }>("/api/admin/outreach/log", {
        method: "POST",
        json: { campaign, channel: how, entries: entries.map((c) => ({ user_id: c.user_id, dedupe_key: c.dedupe_key })) },
      });
      setNotice(`${result.recorded} marked as ${how === "skipped" ? "skipped" : `sent (${CHANNELS[how].toLowerCase()})`}.`);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const chosen = data?.candidates.filter((c) => selected.has(rowKey(c))) ?? [];
  // Bulk email only to members who agreed to email (or anyone, for service messages)
  const emailable = (c: OutreachCandidate) => Boolean(c.email) && (!def.needs_consent || c.consent_email);

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Member <span className="text-gold">outreach</span>
          </h1>
          <p className="text-gray-300">Who to contact and what to say. Send it yourself, then mark it sent so nobody gets it twice.</p>
        </div>
      </section>

      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto space-y-4 px-4">
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => {
                  setCampaign(key);
                  setShowHistory(false);
                }}
                className={`rounded-full border px-3 py-1 text-sm ${campaign === key && !showHistory ? "border-black bg-black text-white" : "bg-white text-gray-700"}`}
              >
                {CAMPAIGNS[key].title}
                {data && data.settings[key].enabled && data.counts[key] > 0 ? (
                  <span className="ml-1 rounded-full bg-gold px-1.5 text-xs font-semibold text-black">{data.counts[key]}</span>
                ) : null}
              </button>
            ))}
            <button
              onClick={() => setShowHistory(true)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${showHistory ? "border-black bg-black text-white" : "bg-white text-gray-700"}`}
            >
              <History className="h-3.5 w-3.5" /> Sent
            </button>
          </div>

          {notice && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {showHistory ? (
            <HistoryPanel />
          ) : !data || !settings ? (
            <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
          ) : (
            <>
              <div className="space-y-2 rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{def.title}</p>
                    <p className="text-sm text-gray-600">
                      {def.rule}.{" "}
                      {def.needs_consent
                        ? "Only members who agreed to email or text messages are listed."
                        : "A service message about something they paid for: listed whatever their marketing choices."}
                      {def.one_off ? " Listed once." : ` Not listed again for ${settings.cooldown_days} days after a contact.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={async (on) => {
                          try {
                            const next = await api<CampaignSettingsMap>("/api/admin/outreach", { method: "PUT", json: { campaign, enabled: on } });
                            setData({ ...data, settings: next });
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      />
                      {settings.enabled ? "On" : "Off"}
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="mr-1 h-4 w-4" /> Message
                    </Button>
                  </div>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500">Preview the message</summary>
                  <p className="mt-2 font-medium">{settings.subject}</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 font-sans text-gray-700">{settings.body}</pre>
                </details>
              </div>

              {!settings.enabled ? (
                <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">This campaign is off.</p>
              ) : loading ? (
                <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
              ) : data.candidates.length === 0 ? (
                <p className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Nobody to contact right now.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={chosen.length === data.candidates.length}
                        onChange={(e) => setSelected(e.target.checked ? new Set(data.candidates.map(rowKey)) : new Set())}
                        className="h-4 w-4 accent-[#D4AF37]"
                      />
                      Select all ({data.candidates.length})
                    </label>
                    <span className="mx-2 h-5 w-px bg-gray-200" />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={chosen.length === 0}
                      onClick={async () => {
                        const emails = chosen.filter(emailable).map((c) => c.email).join(", ");
                        await copyText(emails);
                        setNotice(`Copied ${chosen.filter(emailable).length} email addresses. Paste them into BCC.`);
                      }}
                    >
                      <Copy className="mr-1 h-4 w-4" /> Copy emails for BCC
                    </Button>
                    <select className={`${selectClass} w-auto`} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                      {Object.entries(CHANNELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={chosen.length === 0}
                      className="bg-gold text-black hover:bg-gold/90"
                      onClick={() => mark(chosen, channel)}
                    >
                      Mark {chosen.length || ""} as {channel === "skipped" ? "skipped" : "sent"}
                    </Button>
                  </div>

                  <ul className="space-y-2">
                    {data.candidates.map((c) => {
                      const key = rowKey(c);
                      const msg = message(c);
                      const canEmail = Boolean(c.email) && (!def.needs_consent || c.consent_email);
                      const canText = Boolean(c.phone) && (!def.needs_consent || c.consent_sms);
                      return (
                        <li key={key} className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${c.name}`}
                              checked={selected.has(key)}
                              onChange={(e) =>
                                setSelected((s) => {
                                  const next = new Set(s);
                                  if (e.target.checked) next.add(key);
                                  else next.delete(key);
                                  return next;
                                })
                              }
                              className="mt-1 h-4 w-4 flex-shrink-0 accent-[#D4AF37]"
                            />
                            <div className="min-w-0 space-y-1">
                              <p className="font-semibold">{c.name}</p>
                              <p className="text-sm text-gray-700">{c.detail}</p>
                              <p className="truncate text-xs text-gray-500">
                                {c.email ?? "no email"} {c.phone ? `· ${c.phone}` : ""} · email {c.consent_email ? "✓" : "✗"} · text{" "}
                                {c.consent_sms ? "✓" : "✗"}
                                {c.last_contacted_at ? ` · last contacted ${format(new Date(c.last_contacted_at), "d MMM yyyy")}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await copyText(`${msg.subject}\n\n${msg.body}`);
                                flash(key);
                              }}
                            >
                              {copied === key ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                              Copy message
                            </Button>
                            {canEmail && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`mailto:${c.email}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`}>
                                  <Mail className="mr-1 h-4 w-4" /> Email
                                </a>
                              </Button>
                            )}
                            {canText && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`sms:${c.phone}?&body=${encodeURIComponent(msg.body)}`}>
                                  <MessageSquare className="mr-1 h-4 w-4" /> Text
                                </a>
                              </Button>
                            )}
                            <Button size="sm" className="bg-gold text-black hover:bg-gold/90" onClick={() => mark([c], canEmail ? "email" : canText ? "sms" : "other")}>
                              Sent
                            </Button>
                            <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => mark([c], "skipped")}>
                              Skip
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {editing && data && (
        <TemplateDialog
          campaign={campaign}
          settings={data.settings}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setData({ ...data, settings: next });
            setEditing(false);
          }}
        />
      )}
    </SimpleMainLayout>
  );
}
