// Image skeleton loader components

"use client";

import { cn } from "@/lib/utils";

interface ImageSkeletonProps {
  className?: string;
}

export function ImageSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

export function GridSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-3">
          <ImageSkeleton className="h-64 w-full rounded-lg" />
          <ImageSkeleton className="h-4 w-3/4 rounded" />
          <ImageSkeleton className="h-4 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

export function MasonrySkeleton({ className }: ImageSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <ImageSkeleton
          key={i}
          className="rounded-lg"
          style={{ height: `${200 + Math.random() * 200}px` }}
        />
      ))}
    </div>
  );
}
