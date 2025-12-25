"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth/check');

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Redirect to login with return URL
          const returnTo = encodeURIComponent(pathname);
          router.push(`/admin/login?returnTo=${returnTo}`);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <SimpleMainLayout>
        <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p>Verifying authentication...</p>
          </div>
        </section>
      </SimpleMainLayout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
