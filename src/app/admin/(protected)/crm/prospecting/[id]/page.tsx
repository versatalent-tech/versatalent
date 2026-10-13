"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Loader2, Pause, Pencil, Play, Plus, Square, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ORG_TYPES } from "@/lib/crm/types";
import {
  CAMPAIGN_STATUSES,
  EMAIL_OPT_OUT,
  ENROLMENT_STATUSES,
  PROSPECT_CHANNELS,
  PROSPECT_PLACEHOLDERS,
  emailBlocked,
  type CampaignDetail,
  type ProspectCandidate,
  type ProspectChannel,
  type ProspectStep,
} from "@/lib/prospecting/types";
import { CrmShell, Field, TalentPicker, api, errorMessage, selectClass, useCrmOptions } from "@/components/crm/shared";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SequenceEditor({ campaign, onSaved }: { campaign: CampaignDetail; onSaved: (c: CampaignDetail) => void }) {
  const [steps, setSteps] = useState<ProspectStep[]>(campaign.steps);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const dirty = JSON.stringify(steps) !== JSON.stringify(campaign.steps);

  useEffect(() => setSteps(campaign.steps), [campaign.steps]);

  const update = (index: number, changes: Partial<ProspectStep>) => setSteps((s) => s.map((step, i) => (i === index ? { ...step, ...changes } : step)));
  const move = (index: number, by: number) =>
    setSteps((s) => {
      const next = [...s];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next.map((step, i) => ({ ...step, position: i + 1 }));
    });

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      onSaved(await api<CampaignDetail>(`/api/crm/prospecting/campaigns/${campaign.id}/steps`, { method: "PUT", json: { steps } }));
      setMessage({ kind: "info", text: "Sequence saved" });
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sequence</CardTitle>
        <p className="text-xs text-gray-500">
          Placeholders: {PROSPECT_PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}. Emails always end with: “{EMAIL_OPT_OUT}”
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {message && (
          <div className={`rounded border p-2 text-sm ${message.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
            {message.text}
          </div>
        )}
        {steps.map((step, index) => (
          <div key={index} className="space-y-2 rounded-lg border bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Step {index + 1}</span>
              <select
                id={`step-channel-${index}`}
                className={`${selectClass} h-8 w-auto`}
                value={step.channel}
                onChange={(e) => update(index, { channel: e.target.value as ProspectChannel })}
                aria-label="Channel"
              >
                {Object.entries(PROSPECT_CHANNELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                {index === 0 ? "Days after starting" : "Days after the last step"}
                <Input
                  id={`step-delay-${index}`}
                  type="number"
                  min={0}
                  max={365}
                  className="h-8 w-20"
                  value={step.delay_days}
                  onChange={(e) => update(index, { delay_days: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === steps.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={steps.length === 1}
                  onClick={() => setSteps((s) => s.filter((_, i) => i !== index).map((st, i) => ({ ...st, position: i + 1 })))}
                  aria-label="Remove step"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {step.channel === "email" && (
              <Input id={`step-subject-${index}`} value={step.subject ?? ""} onChange={(e) => update(index, { subject: e.target.value })} placeholder="Subject" />
            )}
            <Textarea id={`step-body-${index}`} rows={step.channel === "email" ? 6 : 3} value={step.body} onChange={(e) => update(index, { body: e.target.value })} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={steps.length >= 20}
            onClick={() => setSteps((s) => [...s, { position: s.length + 1, delay_days: 5, channel: "email", subject: "", body: "Hi {first_name},\n\n\n\nBest,\n{sender}" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add step
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save sequence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddContactsDialog({
  campaign,
  open,
  onOpenChange,
  onAdded,
}: {
  campaign: CampaignDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (c: CampaignDetail, message: string) => void;
}) {
  const [filters, setFilters] = useState({ q: "", orgType: "", tag: "", city: "" });
  const [candidates, setCandidates] = useState<ProspectCandidate[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEmailStep = campaign.steps.some((s) => s.channel === "email");

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v.trim()));
    const timer = setTimeout(() => {
      api<ProspectCandidate[]>(`/api/crm/prospecting/campaigns/${campaign.id}/candidates?${params}`)
        .then(setCandidates)
        .catch((err) => setError(errorMessage(err)));
    }, 250);
    return () => clearTimeout(timer);
  }, [open, filters, campaign.id]);

  useEffect(() => {
    if (open) setChosen(new Set());
  }, [open]);

  const selectable = (c: ProspectCandidate) => !c.do_not_contact && !c.already_enrolled;
  const visible = candidates ?? [];
  const allChosen = visible.filter(selectable).length > 0 && visible.filter(selectable).every((c) => chosen.has(c.id));

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/prospecting/campaigns/${campaign.id}/enrol`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_ids: Array.from(chosen) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success === false) throw new Error(body.error || "Failed to add the contacts");
      onAdded(body.data, body.message);
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
          <DialogTitle>Add contacts</DialogTitle>
          <DialogDescription>Choose who gets this sequence. People marked “do not contact” can&apos;t be added.</DialogDescription>
        </DialogHeader>
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <div className="grid gap-2 sm:grid-cols-4">
          <Input id="candidates-q" className="sm:col-span-2" placeholder="Search name, email or client" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <select id="candidates-type" className={selectClass} value={filters.orgType} onChange={(e) => setFilters({ ...filters, orgType: e.target.value })} aria-label="Client type">
            <option value="">Any client type</option>
            {Object.entries(ORG_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <Input id="candidates-city" placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
          <Input id="candidates-tag" className="sm:col-span-2" placeholder="Client tag, e.g. wedding" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} />
        </div>
        {candidates === null ? (
          <Loader2 className="mx-auto my-6 h-6 w-6 animate-spin text-gray-400" />
        ) : candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No contacts match. Add contacts to clients in the CRM first.</p>
        ) : (
          <div className="space-y-1">
            <label className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
              <input
                id="candidates-all"
                type="checkbox"
                className="h-4 w-4 accent-[#D4AF37]"
                checked={allChosen}
                onChange={(e) => setChosen(e.target.checked ? new Set(visible.filter(selectable).map((c) => c.id)) : new Set())}
              />
              Select all ({visible.filter(selectable).length})
            </label>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {visible.map((c) => (
                <li key={c.id}>
                  <label className={`flex items-start gap-2 rounded p-2 text-sm ${selectable(c) ? "hover:bg-gray-50" : "opacity-50"}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[#D4AF37]"
                      disabled={!selectable(c)}
                      checked={chosen.has(c.id)}
                      onChange={(e) =>
                        setChosen((set) => {
                          const next = new Set(set);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{c.name}</span>
                      {c.organisation && <span className="text-gray-500"> · {c.organisation.name}</span>}
                      <span className="block text-xs text-gray-500">
                        {[c.job_title, c.email, c.organisation?.city].filter(Boolean).join(" · ")}
                        {c.do_not_contact && " · Do not contact"}
                        {c.already_enrolled && " · Already in this campaign"}
                        {hasEmailStep && emailBlocked(c) && " · Sole trader without consent: email steps will be blocked"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={add} disabled={saving || chosen.size === 0} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {chosen.size || ""} contact{chosen.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCampaignDialog({
  campaign,
  open,
  onOpenChange,
  onSaved,
}: {
  campaign: CampaignDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (c: CampaignDetail) => void;
}) {
  const options = useCrmOptions();
  const [name, setName] = useState(campaign.name);
  const [goal, setGoal] = useState(campaign.goal ?? "");
  const [talentIds, setTalentIds] = useState(campaign.talents.map((t) => t.id));
  const [owner, setOwner] = useState(campaign.owner?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(campaign.name);
    setGoal(campaign.goal ?? "");
    setTalentIds(campaign.talents.map((t) => t.id));
    setOwner(campaign.owner?.id ?? "");
    setError(null);
  }, [open, campaign]);

  const save = async () => {
    try {
      onSaved(
        await api<CampaignDetail>(`/api/crm/prospecting/campaigns/${campaign.id}`, {
          method: "PATCH",
          json: { name, goal, talent_ids: talentIds, owner_user_id: owner || null },
        })
      );
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
          <DialogDescription>The owner does the steps for newly added contacts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <Field label="Name">
            <Input id="edit-campaign-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Goal">
            <Textarea id="edit-campaign-goal" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
          <Field label="Owner">
            <select id="edit-campaign-owner" className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">No owner</option>
              {options.owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Talents to put forward">
            <TalentPicker talents={options.talents} value={talentIds} onChange={setTalentIds} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim()} className="bg-gold text-black hover:bg-gold/90">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const options = useCrmOptions();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCampaign(await api<CampaignDetail>(`/api/crm/prospecting/campaigns/${id}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: string) => {
    if (!campaign) return;
    setBusy(status);
    setError(null);
    try {
      setCampaign(await api<CampaignDetail>(`/api/crm/prospecting/campaigns/${campaign.id}`, { method: "PATCH", json: { status } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const enrolmentAction = async (enrolmentId: string, json: Record<string, unknown>) => {
    setBusy(enrolmentId);
    setError(null);
    try {
      const result = await api<{ dealId?: string } | null>(`/api/crm/prospecting/enrolments/${enrolmentId}`, { method: "POST", json });
      if (json.action === "deal" && result?.dealId) {
        router.push(`/admin/crm/deals/${result.dealId}`);
        return;
      }
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!campaign || !window.confirm(`Delete “${campaign.name}”? Messages already logged on contacts stay.`)) return;
    try {
      await api(`/api/crm/prospecting/campaigns/${campaign.id}`, { method: "DELETE" });
      router.push("/admin/crm/prospecting");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const replyRate = useMemo(
    () => (campaign && campaign.stats.contacted ? `${Math.round((campaign.stats.replied / campaign.stats.contacted) * 100)}%` : "—"),
    [campaign]
  );

  if (!campaign) {
    return (
      <CrmShell title="Campaign">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        ) : (
          <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-gold" />
        )}
      </CrmShell>
    );
  }

  const canDelete = options.canDelete || (campaign.created_by !== null && campaign.created_by === options.me);
  const outlineDark = "border-white/40 bg-transparent text-white hover:bg-white hover:text-black";

  return (
    <CrmShell
      title={campaign.name}
      subtitle={
        <span className="text-sm">
          {CAMPAIGN_STATUSES[campaign.status]}
          {campaign.owner ? ` · ${campaign.owner.name}` : ""}
          {campaign.talents.length ? ` · ${campaign.talents.map((t) => t.name).join(", ")}` : ""}
        </span>
      }
      actions={
        <>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button onClick={() => setStatus("active")} disabled={busy !== null} className="bg-gold text-black hover:bg-gold/90">
              <Play className="mr-2 h-4 w-4" />
              {campaign.status === "draft" ? "Start" : "Resume"}
            </Button>
          )}
          {campaign.status === "active" && (
            <Button variant="outline" onClick={() => setStatus("paused")} disabled={busy !== null} className={outlineDark}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {campaign.status !== "done" && campaign.status !== "draft" && (
            <Button variant="outline" onClick={() => setStatus("done")} disabled={busy !== null} className={outlineDark}>
              <Square className="mr-2 h-4 w-4" />
              Finish
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditing(true)} className={outlineDark}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {canDelete && (
            <Button variant="outline" onClick={remove} aria-label="Delete campaign" className="border-white/40 bg-transparent text-white hover:bg-red-600 hover:text-white">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      }
    >
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {info && <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{info}</div>}
      {campaign.goal && <p className="mb-4 text-sm text-gray-600">{campaign.goal}</p>}
      {campaign.status === "draft" && (
        <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">Draft: nothing is due until you press Start. Check the sequence and add contacts first.</p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Contacts" value={campaign.stats.enrolled} />
        <Stat label="In sequence" value={campaign.stats.active} />
        <Stat label="Contacted" value={campaign.stats.contacted} />
        <Stat label="Replied" value={campaign.stats.replied} />
        <Stat label="Reply rate" value={replyRate} />
        <Stat label="Meetings" value={campaign.stats.meetings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <SequenceEditor campaign={campaign} onSaved={setCampaign} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contacts</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={campaign.status === "done"}>
                <UserPlus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {campaign.enrolments.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {campaign.enrolments.map((e) => (
                    <li key={e.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-sm">
                          <p className="font-medium">
                            {e.contact.name}
                            {e.organisation && <span className="font-normal text-gray-500"> · {e.organisation.name}</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ENROLMENT_STATUSES[e.status]}
                            {e.status === "active" &&
                              (e.next_due_at ? ` · step ${e.next_step} due ${format(new Date(e.next_due_at), "d MMM")}` : ` · step ${e.next_step} once started`)}
                          </p>
                          {e.deal && (
                            <Link href={`/admin/crm/deals/${e.deal.id}`} className="text-xs text-gold underline">
                              {e.deal.name}
                            </Link>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 gap-1">
                          {(e.status === "replied" || e.status === "meeting") && !e.deal && (
                            <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => enrolmentAction(e.id, { action: "deal" })}>
                              Create deal
                            </Button>
                          )}
                          {e.status === "active" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={busy === e.id}
                              onClick={() => enrolmentAction(e.id, { action: "remove" })}
                              aria-label={e.first_contacted_at ? `Stop ${e.contact.name}` : `Remove ${e.contact.name}`}
                              title={e.first_contacted_at ? "Stop the sequence for this contact" : "Remove from the campaign"}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddContactsDialog
        campaign={campaign}
        open={adding}
        onOpenChange={setAdding}
        onAdded={(c, message) => {
          setCampaign(c);
          setInfo(message);
        }}
      />
      <EditCampaignDialog campaign={campaign} open={editing} onOpenChange={setEditing} onSaved={setCampaign} />
    </CrmShell>
  );
}
