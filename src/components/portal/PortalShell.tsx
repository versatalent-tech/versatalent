"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, CalendarX, Gift, Home, LogOut, PoundSterling, UserRound } from "lucide-react";

const NAV = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/portal/availability", label: "Days off", icon: CalendarX },
  { href: "/portal/earnings", label: "Earnings", icon: PoundSterling },
  { href: "/portal/rewards", label: "Rewards", icon: Gift },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

export function PortalShell({ talentName, children }: { talentName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === "/portal" ? pathname === href : pathname.startsWith(href));

  const signOut = async () => {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <header className="bg-black text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/versatalent-new-logo.png" alt="VersaTalent" className="h-7 brightness-0 invert" />
            <span className="hidden text-sm text-gray-300 sm:inline">Talent Portal</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="max-w-[10rem] truncate text-gray-300">{talentName}</span>
            <button onClick={signOut} className="flex items-center gap-1 text-gray-300 hover:text-gold" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 md:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-t-md px-4 py-2 text-sm ${active(item.href) ? "bg-gray-50 text-black" : "text-gray-300 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Phone navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-white md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(item.href) ? "text-black" : "text-gray-400"}`}
            >
              <Icon className={`h-5 w-5 ${active(item.href) ? "text-gold" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
