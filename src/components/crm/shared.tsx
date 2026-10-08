"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Inbox, KanbanSquare, Building2 } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { STAGE_LABELS, type CrmOptions, type DealStage } from "@/lib/crm/types";

/** Fetch a CRM API route and unwrap `{ success, data }`, throwing the API's message on failure */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(url, {
    cache: "no-store",
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body.data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export type CrmOptionsWithMe = CrmOptions & { me: string | null; canDelete: boolean };

export function useCrmOptions() {
  const [options, setOptions] = useState<CrmOptionsWithMe>({ owners: [], talents: [], me: null, canDelete: false });
  useEffect(() => {
    api<CrmOptionsWithMe>("/api/crm/options").then(setOptions).catch(() => undefined);
  }, []);
  return options;
}

export function formatMoney(cents: number | null | undefined, currency = "GBP"): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

/** "1,250.50" → 125050; empty → null; invalid → undefined */
export function parseMoney(value: string): number | null | undefined {
  const cleaned = value.replace(/[£€$,\s]/g, "");
  if (cleaned === "") return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : undefined;
}

export const STAGE_STYLES: Record<DealStage, string> = {
  lead: "bg-gray-100 text-gray-800",
  qualified: "bg-sky-100 text-sky-800",
  proposal: "bg-indigo-100 text-indigo-800",
  negotiation: "bg-amber-100 text-amber-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[stage]}`}>{STAGE_LABELS[stage]}</span>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function TalentPicker({
  talents,
  value,
  onChange,
}: {
  talents: CrmOptions["talents"];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  if (talents.length === 0) return <p className="text-sm text-gray-500">No talents available to you.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {talents.map((talent) => {
        const selected = value.includes(talent.id);
        return (
          <button
            key={talent.id}
            type="button"
            onClick={() => onChange(selected ? value.filter((id) => id !== talent.id) : [...value, talent.id])}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              selected ? "border-gold bg-gold/15 text-black" : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
            aria-pressed={selected}
          >
            {talent.name}
          </button>
        );
      })}
    </div>
  );
}

const TABS = [
  { href: "/admin/crm", label: "Pipeline", icon: KanbanSquare },
  { href: "/admin/crm/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/crm/clients", label: "Clients", icon: Building2 },
  { href: "/admin/crm/tasks", label: "My tasks", icon: CheckSquare },
];

/** Page frame for the CRM: dark header, title, actions and section tabs */
export function CrmShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin/crm" ? pathname === href || pathname.startsWith("/admin/crm/deals") : pathname.startsWith(href);

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black pt-10 md:pt-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">{title}</h1>
              {subtitle && <div className="text-gray-300">{subtitle}</div>}
            </div>
            {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(tab.href) ? "bg-gray-50 text-black" : "text-gray-300 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>
      <div className="min-h-[60vh] bg-gray-50 py-6">
        <div className="container mx-auto px-4">{children}</div>
      </div>
    </SimpleMainLayout>
  );
}
