import type { Metadata } from "next";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Talent Portal | VersaTalent",
  robots: { index: false, follow: false },
};

/**
 * Placeholder until the talent portal ships. The previous page here had a
 * demo login that accepted any password and showed generated numbers.
 */
export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="flex min-h-[60vh] items-center bg-gray-50 py-16">
        <div className="container mx-auto max-w-lg px-4 text-center">
          <h1 className="mb-3 text-3xl font-bold">
            Talent <span className="text-gold">Portal</span>
          </h1>
          <p className="mb-8 text-gray-600">
            Our talent portal is on its way. Until it opens, please contact your VersaTalent manager for
            bookings, schedules and profile updates.
          </p>
          <Button asChild className="bg-gold text-black hover:bg-gold/90">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
