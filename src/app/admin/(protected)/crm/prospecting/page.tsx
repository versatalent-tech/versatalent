"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import { Check, Copy, Linkedin, Loader2, Mail, Megaphone, Phone, Plus, SkipForward, Instagram, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CAMPAIGN_STATUSES,
  ENROLMENT_STATUSES,
  PROSPECT_CHANNELS,
  buildMessage,
  emailBlocked,
  type Campaign,
  type DueItem,
  type Outcome,
} from "@/lib/prospecting/types";
import { CrmShell, Field, TalentPicker, api, errorMessage, useCrmOptions } from "@/components/crm/shared";

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  done: "bg-gray-100 text-gray-500",
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* clipboard blocked: nothing to do */
  }
}

function DueCard({ item, sender, onChanged }: { item: DueItem; sender: string; onChanged: () => void }) {
  const router = useRouter();
  const message = buildMessage(item, sender, SITE_URL);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = item.step.channel === "email" && emailBlocked(item.contact);
  const overdue = isPast(new Date(item.due_at)) && !isToday(new Date(item.due_at));

  const post = async (key: string, json: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    try {
      const result = await api<{ dealId?: string } | null>(`/api/crm/prospecting/enrolments/${item.enrolment_id}`, { method: "POST", json });
      if (json.action === "deal" && result && "dealId" in result && result.dealId) {
        router.push(`/admin/crm/deals/${result.dealId}`);
        return;
      }
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const outcome = async (value: Outcome) => {
    const note = value === "replied" || value === "meeting" ? window.prompt("Anything to note? (optional)") : null;
    await post(value, { action: "outcome", outcome: value, note });
  };

  const channelLink =
    item.step.channel === "email" && item.contact.email && !blocked
      ? { href: `mailto:${item.contact.email}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`, label: "Email", icon: Mail }
      : item.step.channel === "linkedin" && item.contact.linkedin_url
        ? { href: item.contact.linkedin_url, label: "Open LinkedIn", icon: Linkedin }
        : item.step.channel === "instagram" && item.contact.instagram
          ? { href: `https://instagram.com/${item.contact.instagram.replace(/^@/, "")}`, label: "Open Instagram", icon: Instagram }
          : item.step.channel === "call" && item.contact.phone
            ? { href: `tel:${item.contact.phone}`, label: "Call", icon: Phone }
            : null;

  return (
    <li className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {item.contact.name}
            {item.organisation && <span className="font-normal text-gray-500"> · {item.organisation.name}</span>}
          </p>
          <p className="text-xs text-gray-500">
            {PROSPECT_CHANNELS[item.step.channel]} · step {item.step.position} of {item.total_steps} ·{" "}
            <Link href={`/admin/crm/prospecting/${item.campaign.id}`} className="underline hover:text-gold">
              {item.campaign.name}
            </Link>
            {item.owner ? ` · ${item.owner.name}` : ""}
            {overdue && <span className="font-medium text-red-600"> · due {formatDistanceToNow(new Date(item.due_at), { addSuffix: true })}</span>}
          </p>
        </div>
      </div>

      {blocked && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Sole trader without recorded consent: don&apos;t email them. Skip this step, or update the contact if they&apos;ve agreed.
        </p>
      )}
      {!channelLink && !blocked && (
        <p className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">
          No {item.step.channel === "email" ? "email address" : item.step.channel === "call" ? "phone number" : PROSPECT_CHANNELS[item.step.channel]} on file. Copy the message, or skip the step.
        </p>
      )}

      <div className="rounded bg-gray-50 p-3 text-sm">
        {message.subject && <p className="mb-1 font-medium">{message.subject}</p>}
        <p className="whitespace-pre-wrap text-gray-700">{message.body}</p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await copyText(message.subject ? `${message.subject}\n\n${message.body}` : message.body);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          Copy
        </Button>
        {channelLink && (
          <Button size="sm" variant="outline" asChild>
            <a href={channelLink.href} target={channelLink.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              <channelLink.icon className="mr-1 h-4 w-4" />
              {channelLink.label}
            </a>
          </Button>
        )}
        <Button
          size="sm"
          className="bg-gold text-black hover:bg-gold/90"
          disabled={busy !== null || blocked}
          onClick={() => post("sent", { action: "step", step: item.step.position, outcome: "sent", message: `${message.subject ? `${message.subject}\n\n` : ""}${message.body}` })}
        >
          {busy === "sent" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
          Done
        </Button>
        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => post("skipped", { action: "step", step: item.step.position, outcome: "skipped" })}>
          <SkipForward className="mr-1 h-4 w-4" />
          Skip step
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
        <span className="text-gray-500">They…</span>
        {(["replied", "meeting", "not_interested", "bounced", "unsubscribed"] as Outcome[]).map((value) => (
          <button
            key={value}
            onClick={() => outcome(value)}
            disabled={busy !== null}
            className="rounded-full border px-2.5 py-1 text-gray-700 hover:border-gold disabled:opacity-50"
          >
            {value === "unsubscribed" ? "Asked to stop" : ENROLMENT_STATUSES[value]}
          </button>
        ))}
      </div>
    </li>
  );
}

function NewCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const options = useCrmOptions();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [talentIds, setTalentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const campaign = await api<Campaign>("/api/crm/prospecting/campaigns", { method: "POST", json: { name, goal, talent_ids: talentIds } });
      router.push(`/admin/crm/prospecting/${campaign.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New prospecting campaign</DialogTitle>
          <DialogDescription>It starts as a draft with a three-step sequence you can edit before starting it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <Field label="Name">
            <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yorkshire wedding venues, spring" />
          </Field>
          <Field label="Goal" hint="Optional: what success looks like">
            <Textarea id="campaign-goal" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
          <Field label="Talents to put forward" hint="Used for {talents} and {talent_links} in the messages">
            <TalentPicker talents={options.talents} value={talentIds} onChange={setTalentIds} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving || !name.trim()} className="bg-gold text-black hover:bg-gold/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProspectingPage() {
  const [tab, setTab] = useState<"due" | "campaigns">("due");
  const [who, setWho] = useState<"me" | "all">("me");
  const [due, setDue] = useState<DueItem[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const options = useCrmOptions();
  const sender = options.meName?.split(" ")[0] || "The VersaTalent team";
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        api<DueItem[]>(`/api/crm/prospecting/due?who=${who}`),
        api<Campaign[]>("/api/crm/prospecting/campaigns"),
      ]);
      setDue(d);
      setCampaigns(c);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [who]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CrmShell
      title={<span className="text-gold">Prospecting</span>}
      subtitle="Campaigns to new clients. Each day, send what's due from your own email, LinkedIn or phone, then record what happened."
      actions={
        <Button onClick={() => setCreating(true)} className="bg-gold text-black hover:bg-gold/90">
          <Plus className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border bg-white p-0.5 text-sm">
          <button onClick={() => setTab("due")} className={`rounded px-3 py-1 ${tab === "due" ? "bg-black text-white" : "text-gray-600"}`}>
            Due today{due ? ` (${due.length})` : ""}
          </button>
          <button onClick={() => setTab("campaigns")} className={`rounded px-3 py-1 ${tab === "campaigns" ? "bg-black text-white" : "text-gray-600"}`}>
            Campaigns
          </button>
        </div>
        {tab === "due" && (
          <div className="flex rounded-md border bg-white p-0.5 text-sm">
            {(["me", "all"] as const).map((value) => (
              <button key={value} onClick={() => setWho(value)} className={`rounded px-3 py-1 ${who === value ? "bg-black text-white" : "text-gray-600"}`}>
                {value === "me" ? "Mine" : "Everyone's"}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {tab === "due" ? (
        due === null ? (
          <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
        ) : due.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center text-gray-500">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            Nothing due today. Start a campaign and add contacts to fill this list.
          </div>
        ) : (
          <ul className="space-y-3">
            {due.map((item) => (
              <DueCard key={`${item.enrolment_id}-${item.step.position}`} item={item} sender={sender} onChanged={load} />
            ))}
          </ul>
        )
      ) : campaigns === null ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-gold" />
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-gray-500">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          No campaigns yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => {
            const rate = c.stats.contacted ? Math.round((c.stats.replied / c.stats.contacted) * 100) : null;
            return (
              <li key={c.id}>
                <Link href={`/admin/crm/prospecting/${c.id}`} className="block rounded-lg border bg-white p-4 hover:border-gold">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{c.name}</p>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>{CAMPAIGN_STATUSES[c.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {c.stats.enrolled} contacts · {c.stats.contacted} contacted · {c.stats.replied} replied
                    {rate !== null ? ` (${rate}%)` : ""} · {c.stats.meetings} meetings
                    {c.stats.due_now > 0 ? ` · ${c.stats.due_now} due` : ""}
                    {c.talents.length ? ` · ${c.talents.map((t) => t.name).join(", ")}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <NewCampaignDialog open={creating} onOpenChange={setCreating} />
    </CrmShell>
  );
}
