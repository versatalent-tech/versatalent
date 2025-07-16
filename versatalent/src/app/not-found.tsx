import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";

export default function NotFound() {
  return (
    <MainLayout>
      <div className="bg-black min-h-[70vh] flex items-center">
        <div className="container px-4 mx-auto text-center">
          <h1 className="text-7xl font-bold text-gold mb-6">404</h1>
          <h2 className="text-3xl font-semibold text-white mb-4">Page Not Found</h2>
          <p className="text-gray-300 max-w-md mx-auto mb-8">
            We couldn't find the page you were looking for. It might have been moved, deleted, or never existed.
          </p>
          <Button asChild className="bg-gold hover:bg-gold/80 text-black">
            <Link href="/">
              Return to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
