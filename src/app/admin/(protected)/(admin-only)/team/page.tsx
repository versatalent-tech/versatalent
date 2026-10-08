"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Check, Copy, KeyRound, Loader2, Pencil, Plus, UserCog } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { ManageableRole, TeamMember } from "@/lib/db/repositories/team";

const ROLE_OPTIONS: { value: ManageableRole; description: string }[] = [
  { value: "admin", description: "Everything, including team, sales and settings" },
  { value: "manager", description: "Assigned talents, including fees and client details" },
  { value: "road_manager", description: "Assigned talents' schedules and logistics, no money" },
  { value: "staff", description: "Till and event-day check-in only" },
];
const ASSIGNABLE: ManageableRole[] = ["manager", "road_manager"];

interface TalentOption {
  id: string;
  name: string;
  is_active: boolean;
}

interface FormState {
  id?: string;
  name: string;
  email: string;
  role: ManageableRole;
  is_active: boolean;
  talentIds: string[];
}

const EMPTY_FORM: FormState = { name: "", email: "", role: "manager", is_active: true, talentIds: [] };

function statusOf(member: TeamMember): { label: string; className: string } {
  if (!member.is_active) return { label: "Deactivated", className: "bg-gray-100 text-gray-600" };
  if (!member.has_password) {
    return member.link_expires_at
      ? { label: "Invite sent", className: "bg-amber-100 text-amber-800" }
      : { label: "Needs invite", className: "bg-red-100 text-red-800" };
  }
  return { label: "Active", className: "bg-green-100 text-green-800" };
}

function CopyableLink({ link, expiresAt }: { link: string; expiresAt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input readOnly value={link} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Send this to them yourself (WhatsApp, email…). It works once and expires {format(new Date(expiresAt), "EEE d MMM, HH:mm")}.
        Anyone with the link can set the password, so send it only to them.
      </p>
    </div>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [talents, setTalents] = useState<TalentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [issuedLink, setIssuedLink] = useState<{ name: string; link: string; expiresAt: string; purpose: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, talentRes] = await Promise.all([
        fetch("/api/admin/team", { cache: "no-store" }),
        fetch("/api/talents?activeOnly=false", { cache: "no-store" }),
      ]);
      const team = await teamRes.json();
      if (!team.success) throw new Error(team.error);
      setMembers(team.data);
      const talentList = await talentRes.json();
      if (Array.isArray(talentList)) {
        setTalents(talentList.map((t: TalentOption) => ({ id: t.id, name: t.name, is_active: t.is_active })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (member: TeamMember) => {
    setFormError(null);
    setForm({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      is_active: member.is_active,
      talentIds: member.talents.map((t) => t.id),
    });
  };

  const toggleTalent = (id: string) => {
    if (!form) return;
    setForm({
      ...form,
      talentIds: form.talentIds.includes(id) ? form.talentIds.filter((t) => t !== id) : [...form.talentIds, id],
    });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const isNew = !form.id;
      const response = await fetch(isNew ? "/api/admin/team" : `/api/admin/team/${form.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { name: form.name, email: form.email, role: form.role, talentIds: form.talentIds }
            : { name: form.name, role: form.role, is_active: form.is_active, talentIds: form.talentIds }
        ),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setForm(null);
      if (isNew) {
        setIssuedLink({ name: form.name, link: body.data.link, expiresAt: body.data.expiresAt, purpose: "invite" });
      }
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const issueLink = async (member: TeamMember) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/team/${member.id}/link`, { method: "POST" });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setIssuedLink({ name: member.name, link: body.data.link, expiresAt: body.data.expiresAt, purpose: body.data.purpose });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    }
  };

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container mx-auto px-4">
            <AdminBackLink />
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-white md:text-5xl">
                  Team <span className="text-gold">&amp; Access</span>
                </h1>
                <p className="text-gray-300">Who can sign in, what they can see, and which talents they look after.</p>
              </div>
              <Button onClick={openNew} className="bg-gold text-black hover:bg-gold/90">
                <Plus className="mr-2 h-4 w-4" />
                Add team member
              </Button>
            </div>
          </div>
        </section>

        <div className="min-h-[50vh] bg-gray-50 py-8">
          <div className="container mx-auto space-y-4 px-4">
            {error && <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

            {loading && members.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : members.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <UserCog className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  No team members yet. Add yourself first as an Admin, so you have a personal login.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {members.map((member) => {
                  const status = statusOf(member);
                  return (
                    <Card key={member.id} className={member.is_active ? "" : "opacity-70"}>
                      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{member.name}</p>
                            <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                          </div>
                          <p className="truncate text-sm text-gray-500">{member.email}</p>
                          {ASSIGNABLE.includes(member.role) && (
                            <p className="text-sm text-gray-600">
                              {member.talents.length > 0
                                ? `Looks after: ${member.talents.map((t) => t.name).join(", ")}`
                                : "No talents assigned: sees nothing yet"}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {member.last_login_at
                              ? `Last signed in ${formatDistanceToNow(new Date(member.last_login_at), { addSuffix: true })}`
                              : "Never signed in"}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          {member.is_active && (
                            <Button variant="outline" size="sm" onClick={() => issueLink(member)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              {member.has_password ? "Reset link" : "Invite link"}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add / edit */}
        <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{form?.id ? "Edit team member" : "Add team member"}</DialogTitle>
              <DialogDescription>
                {form?.id
                  ? "Changes apply straight away, including to anyone already signed in."
                  : "You’ll get a one-time link to send them so they can choose a password."}
              </DialogDescription>
            </DialogHeader>
            {form && (
              <div className="space-y-4">
                {formError && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</div>}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="member-name">
                    Name
                  </label>
                  <Input id="member-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="member-email">
                    Email (used to sign in)
                  </label>
                  <Input
                    id="member-email"
                    type="email"
                    value={form.email}
                    disabled={Boolean(form.id)}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as ManageableRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {ROLE_LABELS[option.value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">{ROLE_OPTIONS.find((o) => o.value === form.role)?.description}</p>
                </div>

                {ASSIGNABLE.includes(form.role) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Talents they look after</label>
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded border p-2">
                      {talents.length === 0 && <p className="p-2 text-sm text-gray-500">No talents found.</p>}
                      {talents.map((talent) => (
                        <label key={talent.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={form.talentIds.includes(talent.id)}
                            onChange={() => toggleTalent(talent.id)}
                            className="h-4 w-4 accent-[#D4AF37]"
                          />
                          <span className="text-sm">{talent.name}</span>
                          {!talent.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {form.id && (
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="text-sm font-medium">Can sign in</p>
                      <p className="text-xs text-gray-500">Turning this off signs them out everywhere.</p>
                    </div>
                    <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="bg-gold text-black hover:bg-gold/90">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form?.id ? "Save changes" : "Add and get link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link to pass on */}
        <Dialog open={issuedLink !== null} onOpenChange={(open) => !open && setIssuedLink(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{issuedLink?.purpose === "reset" ? "Password reset link" : "Invite link"}</DialogTitle>
              <DialogDescription>
                For {issuedLink?.name}. Any earlier link for them no longer works.
              </DialogDescription>
            </DialogHeader>
            {issuedLink && <CopyableLink link={issuedLink.link} expiresAt={issuedLink.expiresAt} />}
            <DialogFooter>
              <Button onClick={() => setIssuedLink(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
