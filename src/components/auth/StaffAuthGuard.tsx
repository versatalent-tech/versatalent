"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2 } from "lucide-react";

interface StaffAuthGuardProps {
  children: React.ReactNode;
}

export function StaffAuthGuard({ children }: StaffAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/staff/auth/check', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
          } else {
            // Redirect to staff login with return URL
            const returnTo = encodeURIComponent(pathname);
            router.push(`/staff/login?returnTo=${returnTo}`);
          }
        } else {
          // Redirect to staff login
          const returnTo = encodeURIComponent(pathname);
          router.push(`/staff/login?returnTo=${returnTo}`);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/staff/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <MainLayout>
        <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="text-white text-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold mx-auto mb-4" />
            <p>Verifying authentication...</p>
          </div>
        </section>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
