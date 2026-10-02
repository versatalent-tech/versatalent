import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * "Back to Admin" link shown above the title of each admin section page.
 * Use tone="light" on pages with a light header background.
 */
export function AdminBackLink({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/admin"
      className={`mb-3 inline-flex items-center gap-1.5 text-sm transition-colors ${
        tone === "dark" ? "text-gray-400 hover:text-gold" : "text-gray-500 hover:text-gold"
      }`}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Admin
    </Link>
  );
}
