"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEAL_SOURCES, DEAL_STAGES, type Activity, type Deal, type DealStage } from "@/lib/crm/types";
import { CrmShell, StageBadge, api, errorMessage, formatMoney, useCrmOptions } from "@/components/crm/shared";
import { DealDialog } from "@/components/crm/DealDialog";
import { ActivityComposer, Timeline } from "@/components/crm/Timeline";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const options = useCrmOptions();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [timeline, setTimeline] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ deal: Deal; timeline: Activity[] }>(`/api/crm/deals/${id}`);
      setDeal(data.deal);
      setTimeline(data.timeline);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const moveTo = async (stage: DealStage) => {
    if (!deal || stage === deal.stage) return;
    const lost_reason = stage === "lost" ? window.prompt("Why was this deal lost? (optional)") : null;
    setMoving(true);
    try {
      await api(`/api/crm/deals/${deal.id}`, { method: "PATCH", json: { stage, ...(lost_reason ? { lost_reason } : {}) } });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setMoving(false);
    }
  };

  const remove = async () => {
    if (!deal || !window.confirm(`Delete “${deal.title}” and its history? Marking it as lost keeps the record.`)) return;
    try {
      await api(`/api/crm/deals/${deal.id}`, { method: "DELETE" });
      router.push("/admin/crm");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!deal) {
    return (
      <CrmShell title="Deal">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        ) : (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        )}
      </CrmShell>
    );
  }

  return (
    <CrmShell
      title={deal.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <StageBadge stage={deal.stage} />
          <span>{formatMoney(deal.value_cents, deal.currency)}</span>
          {deal.organisation && (
            <>
              <span>·</span>
              <Link href={`/admin/crm/clients/${deal.organisation.id}`} className="underline hover:text-gold">
                {deal.organisation.name}
              </Link>
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button variant="outline" onClick={() => setEditing(true)} className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {options.canDelete && (
            <Button variant="outline" onClick={remove} aria-label="Delete deal" className="border-white/40 bg-transparent text-white hover:bg-red-600 hover:text-white">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      }
    >
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {/* Stage stepper */}
      <div className="mb-6 flex flex-wrap gap-1">
        {DEAL_STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => moveTo(stage.key)}
            disabled={moving}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              deal.stage === stage.key
                ? stage.key === "lost"
                  ? "border-red-600 bg-red-600 text-white"
                  : stage.key === "won"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-black bg-black text-white"
                : "bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            {stage.label}
          </button>
        ))}
        {moving && <Loader2 className="ml-2 h-5 w-5 animate-spin self-center text-gray-400" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ActivityComposer links={{ deal_id: deal.id }} options={options} onSaved={load} />
          <Timeline activities={timeline} options={options} onChanged={load} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Detail label="Owner">{deal.owner?.name ?? "Unassigned"}</Detail>
                <Detail label="Talents">{deal.talents.length ? deal.talents.map((t) => t.name).join(", ") : "None yet"}</Detail>
                <Detail label="Expected to close">
                  {deal.expected_close ? format(new Date(`${deal.expected_close}T00:00:00`), "d MMM yyyy") : "—"}
                </Detail>
                <Detail label="Source">{DEAL_SOURCES[deal.source]}</Detail>
                {deal.stage === "lost" && deal.lost_reason && <Detail label="Lost because">{deal.lost_reason}</Detail>}
                <Detail label="Created">{format(new Date(deal.created_at), "d MMM yyyy")}</Detail>
                {deal.notes && (
                  <Detail label="Notes">
                    <span className="whitespace-pre-wrap">{deal.notes}</span>
                  </Detail>
                )}
              </dl>
            </CardContent>
          </Card>

          {deal.contact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{deal.contact.name}</p>
                {deal.contact.email && (
                  <a href={`mailto:${deal.contact.email}`} className="flex items-center gap-2 text-gray-600 hover:text-gold">
                    <Mail className="h-4 w-4" />
                    {deal.contact.email}
                  </a>
                )}
                {deal.contact.phone && (
                  <a href={`tel:${deal.contact.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-gold">
                    <Phone className="h-4 w-4" />
                    {deal.contact.phone}
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DealDialog open={editing} onOpenChange={setEditing} deal={deal} options={options} onSaved={() => load()} />
    </CrmShell>
  );
}
