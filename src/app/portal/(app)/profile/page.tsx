"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, Clock, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EDITABLE_SOCIALS, type PortalProfile, type ProfileFields } from "@/lib/portal/types";
import { api, errorMessage } from "@/components/crm/shared";

const SOCIAL_LABELS: Record<(typeof EDITABLE_SOCIALS)[number], string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  website: "Website",
};

type Form = Omit<ProfileFields, "skills"> & { skills: string };

const toForm = (p: ProfileFields): Form => ({ ...p, skills: p.skills.join(", "), social_links: { ...p.social_links } });

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/portal/password", { method: "POST", json: { current_password: current, new_password: next } });
      setCurrent("");
      setNext("");
      setMessage({ ok: true, text: "Password changed." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="font-semibold">Change password</h2>
      {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Input type="password" autoComplete="new-password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <p className="text-xs text-gray-500">At least 8 characters, with an uppercase letter, a lowercase letter and a number.</p>
      <Button type="submit" variant="outline" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Change password
      </Button>
    </form>
  );
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (p: PortalProfile) => {
    setProfile(p);
    // Start from the pending proposal if there is one, otherwise the live profile
    const base = { ...p.current, ...(p.pending?.changes ?? {}) } as ProfileFields;
    base.social_links = { ...p.current.social_links, ...(p.pending?.changes.social_links ?? {}) };
    setForm(toForm(base));
  };

  useEffect(() => {
    api<PortalProfile>("/api/portal/profile").then(apply).catch((err) => setError(errorMessage(err)));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const changes = {
        tagline: form.tagline,
        bio: form.bio,
        location: form.location,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        social_links: form.social_links,
      };
      apply(await api<PortalProfile>("/api/portal/profile", { method: "POST", json: { changes, note } }));
      setNote("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    apply(await api<PortalProfile>("/api/portal/profile", { method: "DELETE" }));
  };

  if (!profile || !form) {
    return error ? <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p> : <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-gold" />;
  }

  const set = (key: keyof Form, value: string) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-gray-500">Suggest changes to your public profile. The team checks them before they go live.</p>
        </div>
        <Link href={`/talents/${profile.talent_id}`} target="_blank" className="flex items-center gap-1 text-sm text-gold underline">
          View public profile <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {profile.pending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Changes sent {format(new Date(profile.pending.created_at), "d MMM")}, waiting for approval. Saving again replaces them.
          </p>
          <Button size="sm" variant="outline" onClick={withdraw}>
            Withdraw
          </Button>
        </div>
      )}
      {!profile.pending && profile.last_decision && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${
            profile.last_decision.status === "approved" ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {profile.last_decision.status === "approved" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
          <p>
            Your last changes were {profile.last_decision.status === "approved" ? "published" : "not approved"}
            {profile.last_decision.reviewed_at ? ` on ${format(new Date(profile.last_decision.reviewed_at), "d MMM")}` : ""}.
            {profile.last_decision.review_note ? ` “${profile.last_decision.review_note}”` : ""}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-4">
        {error && <p className="text-sm text-red-700">{error}</p>}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tagline</span>
          <Input value={form.tagline} maxLength={200} onChange={(e) => set("tagline", e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Bio</span>
          <Textarea rows={6} value={form.bio} maxLength={5000} onChange={(e) => set("bio", e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Location</span>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Skills</span>
            <Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Comma separated" />
          </label>
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium">Links</legend>
          {EDITABLE_SOCIALS.map((key) => (
            <label key={key} className="block space-y-1 text-sm">
              <span className="text-gray-600">{SOCIAL_LABELS[key]}</span>
              <Input
                value={form.social_links[key] ?? ""}
                placeholder="https://"
                onChange={(e) => setForm((f) => (f ? { ...f, social_links: { ...f.social_links, [key]: e.target.value } } : f))}
              />
            </label>
          ))}
        </fieldset>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Note to the team (optional)</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. new bio for the 2027 season" />
        </label>
        <Button type="submit" disabled={saving} className="bg-gold text-black hover:bg-gold/90">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send for approval
        </Button>
        <p className="text-xs text-gray-500">Photos and portfolio are managed by the team for now. Send new images to your manager.</p>
      </form>

      <PasswordForm />
    </div>
  );
}
