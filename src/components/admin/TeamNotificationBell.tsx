"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/portal/NotificationBell";

/**
 * The team's bell, on every admin page: the admin area has no shared header,
 * so it floats in the bottom-right corner. Hidden on the full list page.
 */
export function TeamNotificationBell() {
  const pathname = usePathname();
  if (pathname === "/admin/notifications") return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden" data-testid="team-notification-bell">
      <NotificationBell
        endpoint="/api/admin/notifications"
        openUp
        allHref="/admin/notifications"
        buttonClassName="relative flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg ring-1 ring-white/20 hover:text-gold"
      />
    </div>
  );
}
