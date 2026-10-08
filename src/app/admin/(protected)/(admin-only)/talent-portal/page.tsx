"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Check, Copy, KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIER_LABELS, type AdminPerk, type ProfileChangeRequest, type TalentLogin, type Tier } from "@/lib/portal/types";
import { Field, api, errorMessage, selectClass } from "@/components/crm/shared";

type Tab = "logins" | "perks" | "requests";

function LinkBox({ link, expiresAt, onClose }: { link: string; expiresAt: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Portal sign-in link</DialogTitle>
          <DialogDescription>Send it to the talent yourself. It works once and expires {format(new Date(expiresAt), "EEE d MMM, HH:mm")}.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={link} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
          <Button
            variant="outline"
            aria-label="Copy link"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoginsTab() {
  const [logins, setLogins] = useState<TalentLogin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ link: string; expiresAt: string } | null>(null);
  const [creating, setCreating] = useState<TalentLogin | null>(null);
  const [email, setEmail] = useState("");

  const load = useCallback(() => {
    api<TalentLogin[]>("/api/admin/talent-portal/logins").then(setLogins).catch((err) => setError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  const link = async (userId: string) => {
    try {
      setIssued(await api(`/api/admin/talent-portal/logins/${userId}/link`, { method: "POST" }));
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggle = async (userId: string, active: boolean) => {
    await api(`/api/admin/talent-portal/logins/${userId}`, { method: "PATCH", json: { is_active: active } }).catch((err) => setError(errorMessage(err)));
    load();
  };

  const create = async () => {
    if (!creating) return;
    try {
      setIssued(await api("/api/admin/talent-portal/logins", { method: "POST", json: { talent_id: creating.talent_id, email } }));
      setCreating(null);
      setEmail("");
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!logins) return error ? <p className="text-red-700">{error}</p> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />;

  return (
    <div className="space-y-3">
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <p className="text-sm text-gray-600">
        Talents sign in at <code className="rounded bg-gray-100 px-1">/portal</code>. Send them a link to set their password; a link also works as a password reset.
      </p>
      <ul className="divide-y rounded-lg border bg-white">
        {logins.map((row) => {
          const u = row.user;
          const status = !u
            ? { label: "No login", style: "bg-gray-100 text-gray-600" }
            : !u.is_active
              ? { label: "Access off", style: "bg-gray-100 text-gray-600" }
              : u.last_login_at
                ? { label: "Using the portal", style: "bg-green-100 text-green-800" }
                : u.link_expires_at
                  ? { label: "Link sent", style: "bg-amber-100 text-amber-800" }
                  : { label: "Not invited yet", style: "bg-red-100 text-red-800" };
          return (
            <li key={row.talent_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {row.talent_name}
                  {!row.is_active_talent && <span className="text-xs font-normal text-gray-400">(inactive talent)</span>}
                  <span className={`rounded px-2 py-0.5 text-xs ${status.style}`}>{status.label}</span>
                </p>
                <p className="truncate text-sm text-gray-500">
                  {u ? u.email : "No account yet"}
                  {u?.last_login_at ? ` · last in ${formatDistanceToNow(new Date(u.last_login_at), { addSuffix: true })}` : ""}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {u ? (
                  <>
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      Access
                      <Switch checked={u.is_active} onCheckedChange={(checked) => toggle(u.id, checked)} />
                    </label>
                    {u.is_active && (
                      <Button size="sm" variant="outline" onClick={() => link(u.id)}>
                        <KeyRound className="mr-1 h-4 w-4" />
                        {u.has_password ? "Reset link" : "Invite link"}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setCreating(row)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Create login
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {creating && (
        <Dialog open onOpenChange={(open) => !open && setCreating(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Portal login for {creating.talent_name}</DialogTitle>
              <DialogDescription>They&apos;ll sign in with this email.</DialogDescription>
            </DialogHeader>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="talent@example.com" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(null)}>
                Cancel
              </Button>
              <Button onClick={create} className="bg-gold text-black hover:bg-gold/90">
                Create and get link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {issued && <LinkBox link={issued.link} expiresAt={issued.expiresAt} onClose={() => setIssued(null)} />}
    </div>
  );
}

const EMPTY_PERK = { title: "", description: "", talent_id: "", min_tier: "", valid_from: "", valid_until: "", is_active: true, sort_order: 0 };

function PerksTab() {
  const [perks, setPerks] = useState<AdminPerk[] | null>(null);
  const [talents, setTalents] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; form: typeof EMPTY_PERK } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<AdminPerk[]>("/api/admin/talent-portal/perks").then(setPerks).catch((err) => setError(errorMessage(err)));
    fetch("/api/talents?activeOnly=false")
      .then((r) => r.json())
      .then((list) => Array.isArray(list) && setTalents(list.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))))
      .catch(() => undefined);
  }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const f = editing.form;
    const json = {
      ...f,
      talent_id: f.talent_id || null,
      min_tier: f.min_tier || null,
      valid_from: f.valid_from || null,
      valid_until: f.valid_until || null,
      sort_order: Number(f.sort_order) || 0,
    };
    try {
      setPerks(
        await api<AdminPerk[]>(editing.id ? `/api/admin/talent-portal/perks/${editing.id}` : "/api/admin/talent-portal/perks", {
          method: editing.id ? "PUT" : "POST",
          json,
        })
      );
      setEditing(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (perk: AdminPerk) => {
    if (!window.confirm(`Delete “${perk.title}”?`)) return;
    setPerks(await api<AdminPerk[]>(`/api/admin/talent-portal/perks/${perk.id}`, { method: "DELETE" }));
  };

  const set = (key: keyof typeof EMPTY_PERK, value: string | boolean | number) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, [key]: value } } : e));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">What artists get from VersaTalent. Each talent sees the perks that apply to them in their portal.</p>
        <Button onClick={() => setEditing({ id: null, form: { ...EMPTY_PERK } })} className="flex-shrink-0 bg-gold text-black hover:bg-gold/90">
          <Plus className="mr-1 h-4 w-4" /> Perk
        </Button>
      </div>
      {error && !editing && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!perks ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
      ) : perks.length === 0 ? (
        <p className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">No perks yet. Add the first one.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {perks.map((perk) => (
            <li key={perk.id} className={`flex items-start justify-between gap-3 p-4 ${perk.is_active ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <p className="font-medium">{perk.title}</p>
                {perk.description && <p className="text-sm text-gray-600">{perk.description}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  {perk.talent ? `Only ${perk.talent.name}` : "All artists"}
                  {perk.min_tier ? ` · ${TIER_LABELS[perk.min_tier]} tier and above` : ""}
                  {perk.valid_from || perk.valid_until ? ` · ${perk.valid_from ?? "now"} to ${perk.valid_until ?? "no end"}` : ""}
                  {!perk.is_active ? " · hidden" : ""}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() =>
                    setEditing({
                      id: perk.id,
                      form: {
                        title: perk.title,
                        description: perk.description ?? "",
                        talent_id: perk.talent?.id ?? "",
                        min_tier: perk.min_tier ?? "",
                        valid_from: perk.valid_from ?? "",
                        valid_until: perk.valid_until ?? "",
                        is_active: perk.is_active,
                        sort_order: perk.sort_order,
                      },
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => remove(perk)} className="text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit perk" : "New perk"}</DialogTitle>
              <DialogDescription>e.g. “2 guest-list places at every VersaTalent event”.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <Field label="Title">
                <Input value={editing.form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Details">
                <Textarea rows={3} value={editing.form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Who gets it">
                  <select className={selectClass} value={editing.form.talent_id} onChange={(e) => set("talent_id", e.target.value)}>
                    <option value="">All artists</option>
                    {talents.map((t) => (
                      <option key={t.id} value={t.id}>
                        Only {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tier needed">
                  <select className={selectClass} value={editing.form.min_tier} onChange={(e) => set("min_tier", e.target.value)}>
                    <option value="">Any (no tier needed)</option>
                    {(["silver", "gold", "black"] as Tier[]).map((t) => (
                      <option key={t} value={t}>
                        {TIER_LABELS[t]} and above
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="From (optional)">
                  <Input type="date" value={editing.form.valid_from} onChange={(e) => set("valid_from", e.target.value)} />
                </Field>
                <Field label="Until (optional)">
                  <Input type="date" value={editing.form.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
                </Field>
                <Field label="Order" hint="Lower numbers show first">
                  <Input type="number" min={0} value={editing.form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
                </Field>
                <label className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
                  Show to artists
                  <Switch checked={editing.form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = { tagline: "Tagline", bio: "Bio", location: "Location", skills: "Skills", social_links: "Links" };

function RequestsTab({ onCount }: { onCount: (n: number) => void }) {
  const [requests, setRequests] = useState<ProfileChangeRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ProfileChangeRequest[]>("/api/admin/talent-portal/requests")
      .then((list) => {
        setRequests(list);
        onCount(list.length);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [onCount]);
  useEffect(load, [load]);

  const decide = async (request: ProfileChangeRequest, decision: "approved" | "rejected") => {
    const note = decision === "rejected" ? window.prompt("Tell the talent why (optional)") : null;
    setBusy(request.id);
    try {
      await api(`/api/admin/talent-portal/requests/${request.id}`, { method: "POST", json: { decision, note } });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (!requests) return error ? <p className="text-red-700">{error}</p> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />;

  return (
    <div className="space-y-3">
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {requests.length === 0 ? (
        <p className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">No profile changes waiting.</p>
      ) : (
        requests.map((r) => (
          <article key={r.id} className="space-y-3 rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{r.talent.name}</p>
              <p className="text-xs text-gray-500">Sent {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
            </div>
            {r.note && <p className="rounded bg-gray-50 p-2 text-sm italic text-gray-600">“{r.note}”</p>}
            <dl className="space-y-2 text-sm">
              {Object.entries(r.changes).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">{FIELD_LABELS[key] ?? key}</dt>
                  <dd className="whitespace-pre-wrap">
                    {Array.isArray(value)
                      ? value.join(", ")
                      : typeof value === "object" && value
                        ? Object.entries(value).map(([k, v]) => `${k}: ${v || "(removed)"}`).join("\n")
                        : String(value || "(empty)")}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(r, "approved")} disabled={busy === r.id} className="bg-gold text-black hover:bg-gold/90">
                Approve and publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide(r, "rejected")} disabled={busy === r.id}>
                Reject
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

export default function TalentPortalAdminPage() {
  const [tab, setTab] = useState<Tab>("logins");
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    api<ProfileChangeRequest[]>("/api/admin/talent-portal/requests").then((r) => setPending(r.length)).catch(() => undefined);
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "logins", label: "Logins" },
    { key: "perks", label: "Artist perks" },
    { key: "requests", label: `Profile requests${pending ? ` (${pending})` : ""}` },
  ];

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black pt-10 md:pt-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
            Talent <span className="text-gold">Portal</span>
          </h1>
          <p className="pb-6 text-gray-300">Logins, the perks artists see, and profile changes waiting for approval.</p>
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium ${tab === t.key ? "bg-gray-50 text-black" : "text-gray-300 hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </section>
      <div className="min-h-[50vh] bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          {tab === "logins" && <LoginsTab />}
          {tab === "perks" && <PerksTab />}
          {tab === "requests" && <RequestsTab onCount={setPending} />}
        </div>
      </div>
    </SimpleMainLayout>
  );
}
