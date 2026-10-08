"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInDays, format, isPast } from "date-fns";
import { AlertTriangle, CalendarClock, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEAL_STAGES, STALE_DEAL_DAYS, weightedValue, type Deal, type DealStage } from "@/lib/crm/types";
import { CrmShell, api, errorMessage, formatMoney, useCrmOptions } from "@/components/crm/shared";
import { DealDialog } from "@/components/crm/DealDialog";

/** Totals per currency, largest first: "£12,000 + €800" */
function sumByCurrency(deals: Deal[], value: (deal: Deal) => number): string {
  const totals = new Map<string, number>();
  for (const deal of deals) totals.set(deal.currency, (totals.get(deal.currency) ?? 0) + value(deal));
  const parts = [...totals.entries()].filter(([, cents]) => cents > 0).sort((a, b) => b[1] - a[1]);
  return parts.length === 0 ? formatMoney(0) : parts.map(([currency, cents]) => formatMoney(cents, currency)).join(" + ");
}

function isStale(deal: Deal): boolean {
  if (deal.stage === "won" || deal.stage === "lost") return false;
  const lastTouch = [deal.stage_changed_at, deal.last_activity_at].filter(Boolean).map((d) => new Date(d!).getTime());
  return differenceInDays(new Date(), new Date(Math.max(...lastTouch))) >= STALE_DEAL_DAYS;
}

function DealCard({
  deal,
  onMove,
  onDragStart,
}: {
  deal: Deal;
  onMove: (deal: Deal, stage: DealStage) => void;
  onDragStart: (deal: Deal) => void;
}) {
  const router = useRouter();
  const stale = isStale(deal);
  const taskOverdue = deal.next_task ? isPast(new Date(deal.next_task.due_at)) : false;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", deal.id);
        onDragStart(deal);
      }}
      onClick={() => router.push(`/admin/crm/deals/${deal.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/admin/crm/deals/${deal.id}`)}
      role="link"
      tabIndex={0}
      className="cursor-pointer space-y-1.5 rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gold"
    >
      <p className="font-medium leading-snug">{deal.title}</p>
      {deal.organisation && <p className="truncate text-sm text-gray-500">{deal.organisation.name}</p>}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{formatMoney(deal.value_cents, deal.currency)}</span>
        {deal.owner && <span className="truncate text-xs text-gray-400">{deal.owner.name}</span>}
      </div>
      {deal.talents.length > 0 && (
        <p className="truncate text-xs text-gray-500">{deal.talents.map((t) => t.name).join(", ")}</p>
      )}
      {deal.next_task && (
        <p className={`flex items-center gap-1 text-xs ${taskOverdue ? "font-medium text-red-600" : "text-gray-500"}`}>
          <CalendarClock className="h-3.5 w-3.5" />
          {deal.next_task.subject} · {format(new Date(deal.next_task.due_at), "d MMM")}
        </p>
      )}
      {stale && !deal.next_task && (
        <p className="flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          No activity for {STALE_DEAL_DAYS}+ days
        </p>
      )}
      {/* Touch screens can't drag: move with a menu instead */}
      <select
        className="mt-1 w-full rounded border px-2 py-1 text-xs md:hidden"
        value={deal.stage}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMove(deal, e.target.value as DealStage)}
        aria-label="Move to stage"
      >
        {DEAL_STAGES.map((stage) => (
          <option key={stage.key} value={stage.key}>
            {stage.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PipelinePage() {
  const options = useCrmOptions();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<"all" | "me">("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragging, setDragging] = useState<Deal | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (ownerFilter === "me") params.set("owner", "me");
      if (query.trim()) params.set("q", query.trim());
      setDeals(await api<Deal[]>(`/api/crm/deals?${params}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ownerFilter, query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const move = async (deal: Deal, stage: DealStage) => {
    if (deal.stage === stage) return;
    let lost_reason: string | null = null;
    if (stage === "lost") {
      lost_reason = window.prompt("Why was this deal lost? (optional)") ?? null;
    }
    const previous = deals;
    setDeals((all) => all.map((d) => (d.id === deal.id ? { ...d, stage } : d)));
    try {
      const updated = await api<Deal>(`/api/crm/deals/${deal.id}`, {
        method: "PATCH",
        json: { stage, ...(lost_reason ? { lost_reason } : {}) },
      });
      setDeals((all) => all.map((d) => (d.id === deal.id ? updated : d)));
    } catch (err) {
      setDeals(previous);
      setError(errorMessage(err));
    }
  };

  const byStage = useMemo(() => {
    const groups = Object.fromEntries(DEAL_STAGES.map((s) => [s.key, [] as Deal[]])) as Record<DealStage, Deal[]>;
    for (const deal of deals) groups[deal.stage].push(deal);
    return groups;
  }, [deals]);

  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");

  return (
    <CrmShell
      title={
        <>
          Sales <span className="text-gold">Pipeline</span>
        </>
      }
      subtitle={
        <span className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            Open: <strong className="text-white">{sumByCurrency(open, (d) => d.value_cents ?? 0)}</strong> ({open.length})
          </span>
          <span title="Value × chance of winning at each stage">
            Weighted: <strong className="text-white">{sumByCurrency(open, weightedValue)}</strong>
          </span>
          <span>
            Won, last 60 days: <strong className="text-white">{sumByCurrency(byStage.won, (d) => d.value_cents ?? 0)}</strong>
          </span>
        </span>
      }
      actions={
        <Button onClick={() => setDialogOpen(true)} className="bg-gold text-black hover:bg-gold/90">
          <Plus className="mr-2 h-4 w-4" />
          New deal
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deals, clients, contacts" className="bg-white pl-9" />
        </div>
        <div className="flex self-start rounded-md border bg-white p-0.5 text-sm">
          {(["all", "me"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setOwnerFilter(value)}
              className={`rounded px-3 py-1 ${ownerFilter === value ? "bg-black text-white" : "text-gray-600"}`}
            >
              {value === "all" ? "All deals" : "My deals"}
            </button>
          ))}
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => {
          const column = byStage[stage.key];
          const isTarget = dragging && overStage === stage.key && dragging.stage !== stage.key;
          return (
            <section
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.key);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const deal = deals.find((d) => d.id === e.dataTransfer.getData("text/plain"));
                setDragging(null);
                setOverStage(null);
                if (deal) move(deal, stage.key);
              }}
              className={`flex w-72 flex-shrink-0 flex-col rounded-lg p-2 transition-colors ${
                isTarget ? "bg-amber-100" : stage.key === "won" ? "bg-green-50" : stage.key === "lost" ? "bg-red-50/60" : "bg-gray-100"
              }`}
            >
              <header className="mb-2 px-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <span className="text-xs text-gray-500">{column.length}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {sumByCurrency(column, (d) => d.value_cents ?? 0)}
                  {(stage.key === "won" || stage.key === "lost") && " · last 60 days"}
                </p>
              </header>
              <div className="flex min-h-24 flex-col gap-2">
                {column.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onMove={move} onDragStart={setDragging} />
                ))}
                {column.length === 0 && !loading && (
                  <p className="rounded border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400">Drop deals here</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {!loading && deals.length === 0 && !query && (
        <p className="mt-2 text-center text-sm text-gray-500">
          No deals yet. Create one, or convert a website enquiry from the{" "}
          <Link href="/admin/crm/enquiries" className="text-gold underline">
            Enquiries
          </Link>{" "}
          inbox.
        </p>
      )}

      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={null}
        options={options}
        onSaved={(deal) => setDeals((all) => [deal, ...all])}
      />
    </CrmShell>
  );
}
