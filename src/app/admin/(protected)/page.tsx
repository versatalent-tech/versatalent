"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckSquare,
  Inbox,
  KanbanSquare,
  Calendar,
  CheckCircle2,
  CreditCard,
  Instagram,
  Layers,
  Loader2,
  Mail,
  Nfc,
  Package,
  PenLine,
  Receipt,
  RefreshCw,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/utils/formatting";
import type {
  CurrencyTotal,
  DashboardAttentionItem,
  DashboardSummary,
  DashboardUpcomingEvent,
  ScopedDashboardSummary,
} from "@/lib/db/repositories/dashboard";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { BOOKING_STATUSES, type Booking } from "@/lib/bookings/types";
import type { PaymentMethod } from "@/lib/db/types";

const SECTIONS = [
  {
    title: "Bookings & sales",
    links: [
      { title: "Bookings calendar", description: "Holds, confirmed jobs, availability", icon: Calendar, href: "/admin/bookings" },
      { title: "Pipeline", description: "Deals from lead to won", icon: KanbanSquare, href: "/admin/crm" },
      { title: "Enquiries", description: "Website form messages", icon: Inbox, href: "/admin/crm/enquiries" },
      { title: "Clients", description: "Brands, venues and contacts", icon: Building2, href: "/admin/crm/clients" },
      { title: "Tasks", description: "Your follow-ups", icon: CheckSquare, href: "/admin/crm/tasks" },
    ],
  },
  {
    title: "Roster & content",
    links: [
      { title: "Talents", description: "Profiles, portfolios and logins", icon: Users, href: "/admin/talents" },
      { title: "Events", description: "Create, publish and close events", icon: Calendar, href: "/admin/events" },
      { title: "Blog", description: "Posts with images and video", icon: PenLine, href: "/admin/blogs" },
      { title: "Instagram", description: "Feed connection and settings", icon: Instagram, href: "/admin/instagram" },
      { title: "Newsletter", description: "Subscribers and exports", icon: Mail, href: "/admin/newsletter" },
    ],
  },
  {
    title: "Membership & check-in",
    links: [
      { title: "NFC cards & check-ins", description: "Users, cards, events and scans", icon: Nfc, href: "/admin/nfc" },
      { title: "VIP programme", description: "Tiers, points and benefits", icon: Trophy, href: "/admin/vip" },
    ],
  },
  {
    title: "Sales",
    links: [
      { title: "Products & stock", description: "Till catalogue and inventory", icon: Package, href: "/admin/pos/products" },
      { title: "Orders", description: "Payments, refunds and history", icon: Receipt, href: "/admin/pos/orders" },
      { title: "SumUp card payments", description: "Account and card readers", icon: CreditCard, href: "/admin/pos/sumup" },
    ],
  },
  {
    title: "Team & reference",
    links: [
      { title: "Team & access", description: "Logins, roles and assigned talents", icon: UserCog, href: "/admin/team" },
      { title: "System architecture", description: "Printable technical overview", icon: Layers, href: "/admin/architecture" },
    ],
  },
];

const SEVERITY_STYLES = {
  high: "border-red-200 bg-red-50 text-red-900",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  low: "border-gray-200 bg-gray-50 text-gray-800",
} as const;

const ORDER_STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-100 text-gray-700",
  failed: "bg-red-100 text-red-800",
};

function RevenueLines({ current, previous }: { current: CurrencyTotal[]; previous: CurrencyTotal[] }) {
  if (current.length === 0) {
    return <p className="text-3xl font-bold">{formatCurrency(0)}</p>;
  }
  return (
    <div className="space-y-1">
      {current.map((row) => {
        const before = previous.find((p) => p.currency === row.currency)?.cents ?? 0;
        const change = before > 0 ? Math.round(((row.cents - before) / before) * 100) : null;
        return (
          <div key={row.currency} className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatCurrency(row.cents, row.currency)}</span>
            {change !== null && (
              <span className={`text-xs ${change >= 0 ? "text-green-700" : "text-red-700"}`}>
                {change >= 0 ? "+" : ""}
                {change}% vs prior 30 days
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

type Viewer = { name: string | null; role: string; canUseCrm: boolean };
type DashboardResponse =
  | ({ view: "full"; viewer: Viewer; upcoming_bookings: Booking[] } & DashboardSummary)
  | ({ view: "scoped"; viewer: Viewer; upcoming_bookings: Booking[] } & ScopedDashboardSummary);

function NextBookingsCard({ bookings }: { bookings: Booking[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Next bookings</CardTitle>
        <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gold">
          Calendar
        </Link>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing booked yet.</p>
        ) : (
          <ul className="divide-y">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {b.talent.name}: {b.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(b.starts_at), "EEE d MMM, HH:mm")}
                    {b.location ? ` · ${b.location}` : ""}
                  </p>
                  {b.call_time && <p className="text-xs text-gray-500">Call: {b.call_time}</p>}
                </div>
                {b.status === "hold" && <Badge variant="outline">{BOOKING_STATUSES.hold}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionList({ items }: { items: DashboardAttentionItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Needs attention</h2>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
          <CheckCircle2 className="h-5 w-5" />
          All clear: nothing needs action right now.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-start gap-3 rounded-lg border p-4 transition-shadow hover:shadow-sm ${SEVERITY_STYLES[item.severity]}`}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm opacity-80">{item.detail}</p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingEventsCard({ events, linkToAll }: { events: DashboardUpcomingEvent[]; linkToAll: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Coming up</CardTitle>
        {linkToAll && (
          <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gold">
            All events
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming events.</p>
        ) : (
          <ul className="divide-y">
            {events.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(event.start_time), "EEE d MMM, HH:mm")}
                    {event.venue_name ? ` · ${event.venue_name}` : ""}
                  </p>
                  {event.talent_names.length > 0 && (
                    <p className="truncate text-xs text-gray-500">{event.talent_names.join(", ")}</p>
                  )}
                </div>
                {!event.is_published && <Badge variant="outline">Draft</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScopedView({
  summary,
  canUseCrm,
  bookings,
}: {
  summary: ScopedDashboardSummary;
  canUseCrm: boolean;
  bookings: Booking[];
}) {
  return (
    <>
      <AttentionList items={summary.attention} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">{canUseCrm ? "Bookings & sales" : "Bookings"}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {SECTIONS[0].links
            .filter((link) => canUseCrm || link.href === "/admin/bookings")
            .map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md">
                  <Icon className="h-5 w-5 flex-shrink-0 text-gold" />
                  <span className="font-medium">{link.title}</span>
                </Link>
              );
            })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your talents</h2>
        {summary.talents.length === 0 ? (
          <p className="text-sm text-gray-500">No talents assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.talents.map((talent) => (
              <Link
                key={talent.id}
                href={`/talents/${talent.id}`}
                className="flex items-center gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
              >
                {talent.image_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={talent.image_src} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
                    <Users className="h-5 w-5 text-gold" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {talent.name}
                    {!talent.is_active && <span className="ml-2 text-xs font-normal text-gray-500">(inactive)</span>}
                  </p>
                  <p className="truncate text-sm text-gray-500">{talent.profession}</p>
                  <p className="truncate text-xs text-gray-500">
                    {talent.next_event
                      ? `Next: ${talent.next_event.title}, ${format(new Date(talent.next_event.start_time), "d MMM")}`
                      : "Nothing scheduled"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <NextBookingsCard bookings={bookings} />
        <UpcomingEventsCard events={summary.upcoming_events} linkToAll={false} />
      </section>
    </>
  );
}

function StatCard({
  label,
  href,
  children,
  footnote,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardDescription>{label}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
          {footnote && <p className="mt-1 text-xs text-gray-500">{footnote}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminPage() {
  const [summary, setSummary] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || "Failed to load dashboard");
      }
      setSummary(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tiers = summary?.view === "full"
    ? Object.entries(summary.community.vip_by_tier)
        .map(([tier, n]) => `${n} ${tier}`)
        .join(" · ")
    : "";

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        {/* Header */}
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
                  Admin <span className="text-gold">Dashboard</span>
                </h1>
                <p className="text-gray-300">
                  {summary
                    ? `${summary.viewer.name ? `${summary.viewer.name} · ` : ""}${ROLE_LABELS[summary.viewer.role] ?? summary.viewer.role} · updated ${formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}`
                    : "What needs doing, and how the agency is tracking"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={load}
                  disabled={loading}
                  className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
                <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gray-50 py-8">
          <div className="container mx-auto space-y-8 px-4">
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="flex items-center justify-between gap-4 py-4 text-red-900">
                  <span>{error}</span>
                  <Button size="sm" variant="outline" onClick={load}>
                    Try again
                  </Button>
                </CardContent>
              </Card>
            )}

            {!summary && loading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            )}

            {summary?.view === "scoped" && (
              <ScopedView summary={summary} canUseCrm={summary.viewer.canUseCrm} bookings={summary.upcoming_bookings} />
            )}

            {summary?.view === "full" && (
              <>
                <AttentionList items={summary.attention} />

                {/* Key figures */}
                <section>
                  <h2 className="mb-3 text-lg font-semibold">Last 30 days</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                      label="Till revenue (paid orders)"
                      href="/admin/pos/orders"
                      footnote={`${summary.sales.paid_orders_30d} paid order${summary.sales.paid_orders_30d === 1 ? "" : "s"}`}
                    >
                      <RevenueLines current={summary.sales.revenue_30d} previous={summary.sales.revenue_prev_30d} />
                    </StatCard>
                    <StatCard
                      label="Active talents"
                      href="/admin/talents"
                      footnote={`${summary.roster.talents_with_portal_account} with a login · ${summary.roster.inactive_talents} inactive`}
                    >
                      <p className="text-3xl font-bold">{summary.roster.active_talents}</p>
                    </StatCard>
                    <StatCard
                      label="Upcoming events"
                      href="/admin/events"
                      footnote={`${summary.events.next_30_days} in the next 30 days`}
                    >
                      <p className="text-3xl font-bold">{summary.events.upcoming}</p>
                    </StatCard>
                    <StatCard label="Active VIP members" href="/admin/vip" footnote={tiers || "No active members"}>
                      <p className="text-3xl font-bold text-gold">{summary.community.vip_members}</p>
                    </StatCard>
                    <StatCard label="NFC check-ins" href="/admin/nfc">
                      <p className="text-3xl font-bold">{summary.community.checkins_30d}</p>
                    </StatCard>
                    <StatCard
                      label="Newsletter subscribers"
                      href="/admin/newsletter"
                      footnote={`+${summary.community.newsletter_new_30d} new · ${summary.content.published_posts} blog post${summary.content.published_posts === 1 ? "" : "s"} live${
                        summary.content.last_published_at
                          ? `, last ${formatDistanceToNow(new Date(summary.content.last_published_at), { addSuffix: true })}`
                          : ""
                      }`}
                    >
                      <p className="text-3xl font-bold">{summary.community.newsletter_active}</p>
                    </StatCard>
                  </div>
                </section>

                {/* Upcoming events + recent orders */}
                <section className="grid gap-6 lg:grid-cols-2">
                  <NextBookingsCard bookings={summary.upcoming_bookings} />
                  <UpcomingEventsCard events={summary.upcoming_events} linkToAll />

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Latest orders</CardTitle>
                      <Link href="/admin/pos/orders" className="text-sm text-gray-500 hover:text-gold">
                        All orders
                      </Link>
                    </CardHeader>
                    <CardContent>
                      {summary.recent_orders.length === 0 ? (
                        <p className="text-sm text-gray-500">No orders yet.</p>
                      ) : (
                        <ul className="divide-y">
                          {summary.recent_orders.map((order) => (
                            <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <p className="font-medium">{formatCurrency(order.total_cents, order.currency)}</p>
                                <p className="truncate text-sm text-gray-500">
                                  {order.customer_name || "Walk-in"}
                                  {order.payment_method
                                    ? ` · ${PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod] ?? order.payment_method}`
                                    : ""}
                                  {` · ${formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}`}
                                </p>
                              </div>
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                                  ORDER_STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {order.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </>
            )}

            {/* Tools */}
            {summary?.view === "full" && SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group flex items-center gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50">
                          <Icon className="h-5 w-5 text-gold" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{link.title}</p>
                          <p className="truncate text-sm text-gray-500">{link.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gold" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
