"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEAL_SOURCES, type DealSource } from "@/lib/crm/types";
import { KPI_GROUPS, KPIS, formatKpi, type KpiDefinition, type KpiReport } from "@/lib/kpis/types";
import { CrmShell, api, errorMessage } from "@/components/crm/shared";

type Range = "month" | "last3" | "ytd";

const SHORT_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const monthLabel = (month: string) => SHORT_MONTH.format(new Date(`${month}T00:00:00Z`));

function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date());
}

/** Change against the previous period: points for percentages, % for everything else */
function delta(kpi: KpiDefinition, now: number | null | undefined, before: number | null | undefined) {
  if (now === null || now === undefined || before === null || before === undefined) return null;
  const diff = now - before;
  if (Math.abs(diff) < 1e-9) return { text: "No change", good: null as boolean | null, up: null as boolean | null };
  const up = diff > 0;
  const text =
    kpi.unit === "percent"
      ? `${up ? "+" : "−"}${Math.abs(Math.round(diff))} pts`
      : before === 0
        ? `${up ? "+" : "−"}${formatKpi(Math.abs(diff), kpi.unit)}`
        : `${up ? "+" : "−"}${Math.abs(Math.round((diff / Math.abs(before)) * 100))}%`;
  return { text, good: up === kpi.higherIsBetter, up };
}

/** Six months, one line: grey history, the latest month in gold. Hover a point for its value. */
function Sparkline({ kpi, points }: { kpi: KpiDefinition; points: { month: string; value: number | null }[] }) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length < 2) return <div className="h-8" aria-hidden="true" />;
  const W = 120;
  const H = 32;
  const pad = 4;
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const path = points
    .map((p, i) => (p.value === null ? null : `${x(i)},${y(p.value)}`))
    .filter(Boolean)
    .join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-[120px]" role="img" aria-label={`${kpi.label}, last six months`}>
      <polyline points={path} fill="none" stroke="#9CA3AF" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p.value === null ? null : (
          <g key={p.month}>
            {/* Larger invisible target for hover */}
            <circle cx={x(i)} cy={y(p.value)} r={8} fill="transparent">
              <title>{`${monthLabel(p.month)}: ${formatKpi(p.value, kpi.unit)}`}</title>
            </circle>
            {p === last && <circle cx={x(i)} cy={y(p.value)} r={4} fill="#D4AF37" stroke="#fff" strokeWidth={2} pointerEvents="none" />}
          </g>
        )
      )}
    </svg>
  );
}

function TargetMeter({ kpi, value, target }: { kpi: KpiDefinition; value: number | null; target: number }) {
  const share = value === null || target <= 0 ? 0 : (value / target) * 100;
  const met = kpi.higherIsBetter ? share >= 100 : value !== null && value <= target;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full rounded-full bg-[#F3E7B9]">
        <div className="h-1.5 rounded-full bg-[#D4AF37]" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
      </div>
      <p className="text-xs text-gray-600">
        {kpi.higherIsBetter ? `${Math.round(share)}% of` : met ? "Within" : "Above"} target {formatKpi(target, kpi.unit)}
        {met && " ✓"}
      </p>
    </div>
  );
}

function KpiTile({
  kpi,
  report,
  onSetTarget,
}: {
  kpi: KpiDefinition;
  report: KpiReport;
  onSetTarget: (kpi: KpiDefinition) => void;
}) {
  const value = report.values[kpi.key];
  const change = delta(kpi, value, report.previous[kpi.key]);
  const target = report.targets[kpi.key];
  const trend = report.trend.map((t) => ({ month: t.month, value: t.values[kpi.key] ?? null }));
  const Arrow = change?.up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-600">{kpi.label}</p>
        {report.can_set_targets && report.period.month && kpi.key !== "weighted_pipeline" && (
          <button onClick={() => onSetTarget(kpi)} className="text-gray-400 hover:text-gold" aria-label={`Set target for ${kpi.label}`} title="Set this month's target">
            <Target className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold">{formatKpi(value, kpi.unit)}</p>
          {change && (
            <p
              className={`flex items-center gap-0.5 text-xs font-medium ${
                change.good === null ? "text-gray-500" : change.good ? "text-green-700" : "text-red-700"
              }`}
            >
              {change.up !== null && <Arrow className="h-3.5 w-3.5" aria-hidden="true" />}
              {change.text} <span className="font-normal text-gray-500">vs previous period</span>
            </p>
          )}
        </div>
        <Sparkline kpi={kpi} points={trend} />
      </div>
      {target !== undefined && <TargetMeter kpi={kpi} value={value} target={target} />}
      <p className="text-xs text-gray-500">{kpi.definition}</p>
    </div>
  );
}

function LeadsBySource({ rows }: { rows: KpiReport["leads_by_source"] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">New leads by source</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No new leads in this period.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.source} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-sm" title={`${DEAL_SOURCES[r.source as DealSource] ?? r.source}: ${r.count}`}>
              <span className="truncate text-gray-600">{DEAL_SOURCES[r.source as DealSource] ?? r.source}</span>
              <span className="h-3 rounded-r bg-[#D4AF37]" style={{ width: `${(r.count / max) * 100}%`, minWidth: 4 }} />
              <span className="text-right tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Utilisation({ rows }: { rows: KpiReport["utilisation"] }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">Utilisation by talent</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No active talents.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-2 font-medium">Talent</th>
                <th className="pb-2 text-right font-medium">Booked days</th>
                <th className="pb-2 text-right font-medium">Available</th>
                <th className="w-40 pb-2 pl-4 font-medium">Utilisation</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.talent.id} className="border-t">
                  <td className="py-2">{r.talent.name}</td>
                  <td className="py-2 text-right">{r.booked_days}</td>
                  <td className="py-2 text-right">{r.available_days}</td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-[#F3E7B9]">
                        <div className="h-1.5 rounded-full bg-[#D4AF37]" style={{ width: `${Math.min(100, r.rate ?? 0)}%` }} />
                      </div>
                      <span className="w-10 text-right">{r.rate === null ? "—" : `${Math.round(r.rate)}%`}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function KpisPage() {
  const [range, setRange] = useState<Range>("month");
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<KpiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = range === "month" ? `range=month&month=${month}` : `range=${range}`;
      setReport(await api<KpiReport>(`/api/crm/kpis?${query}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range, month]);

  useEffect(() => {
    load();
  }, [load]);

  const setTarget = async (kpi: KpiDefinition) => {
    if (!report?.period.month) return;
    const current = report.targets[kpi.key];
    const hint = kpi.unit === "money" ? " in pounds" : kpi.unit === "percent" ? " as a percentage" : "";
    const answer = window.prompt(`Target for “${kpi.label}” in ${report.period.label}${hint}. Leave empty to remove it.`, current !== undefined ? String(kpi.unit === "money" ? current / 100 : current) : "");
    if (answer === null) return;
    const trimmed = answer.trim().replace(/[£,%\s]/g, "");
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Enter the target as a number");
      return;
    }
    try {
      await api("/api/crm/kpis/targets", {
        method: "PUT",
        json: { month: report.period.month.slice(0, 7), metric: kpi.key, target: parsed === null ? null : kpi.unit === "money" ? Math.round(parsed * 100) : parsed },
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const groups = (Object.keys(KPI_GROUPS) as (keyof typeof KPI_GROUPS)[])
    .map((group) => ({ group, kpis: KPIS.filter((k) => k.group === group && report && k.key in report.values) }))
    .filter((g) => g.kpis.length > 0);

  return (
    <CrmShell
      title={<span className="text-gold">KPIs</span>}
      subtitle={report ? `${report.period.label}. Change is against the period of the same length just before.` : "How the agency is doing."}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border bg-white p-0.5 text-sm">
          {(
            [
              ["month", "Month"],
              ["last3", "Last 3 months"],
              ["ytd", "Year to date"],
            ] as [Range, string][]
          ).map(([value, text]) => (
            <button key={value} onClick={() => setRange(value)} className={`rounded px-3 py-1 ${range === value ? "bg-black text-white" : "text-gray-600"}`}>
              {text}
            </button>
          ))}
        </div>
        {range === "month" && (
          <Input id="kpi-month" type="month" value={month} max={currentMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-auto bg-white" aria-label="Month" />
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        {report?.can_set_targets && range !== "month" && <span className="text-xs text-gray-500">Choose a single month to see and set targets.</span>}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {report && (
        <div className="space-y-8">
          {groups.map(({ group, kpis }) => (
            <section key={group}>
              <h2 className="mb-3 text-lg font-semibold">{KPI_GROUPS[group]}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                  <KpiTile key={kpi.key} kpi={kpi} report={report} onSetTarget={setTarget} />
                ))}
              </div>
              {group === "sales" && (
                <div className="mt-3">
                  <LeadsBySource rows={report.leads_by_source} />
                </div>
              )}
              {group === "bookings" && (
                <div className="mt-3">
                  <Utilisation rows={report.utilisation} />
                </div>
              )}
            </section>
          ))}
          <p className="text-xs text-gray-500">
            Money figures count GBP only. The small charts show the last six months, with the latest in gold; hover a point for its value. Past months
            come from a nightly snapshot, so editing old records doesn&apos;t change them.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={load}>
              Refresh
            </Button>
          </div>
        </div>
      )}
    </CrmShell>
  );
}
