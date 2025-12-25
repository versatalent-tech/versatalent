"use client";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface DynamicLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component for dynamic imports with loading fallback
 * Reduces initial bundle size by code-splitting heavy admin components
 */
export function DynamicLoader({ children, fallback }: DynamicLoaderProps) {
  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      {children}
    </Suspense>
  );
}

/**
 * Default loading state for admin components
 */
function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-gold mx-auto mb-4" />
        <p className="text-gray-600">Loading component...</p>
      </div>
    </div>
  );
}

/**
 * Loading fallback for full-page admin sections
 */
export function AdminPageLoader() {
  return (
    <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-gold mx-auto mb-4" />
            <p className="text-white text-xl">Loading...</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Small inline loader for component loading
 */
export function InlineLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-gold" />
    </div>
  );
}
