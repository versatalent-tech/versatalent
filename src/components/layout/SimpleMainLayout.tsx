import type React from "react";
import { SimpleHeader } from "./SimpleHeader";
import { Footer } from "./Footer";

/**
 * Simplified MainLayout for admin pages
 * Uses SimpleHeader without Radix UI Dialog/Sheet to avoid compatibility issues
 */
export function SimpleMainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SimpleHeader />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
