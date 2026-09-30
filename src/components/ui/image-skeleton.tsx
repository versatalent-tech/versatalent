// Image skeleton loader components

"use client";

import { cn } from "@/lib/utils";

interface ImageSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

interface SkeletonGridProps {
  className?: string;
  count?: number;
}

// Fixed heights (not Math.random) so server and client render the same markup
const MASONRY_HEIGHTS = [260, 340, 220, 380, 300, 240, 360, 280, 320];

export function ImageSkeleton({ className, style }: ImageSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: "shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function GridSkeleton({ className, count = 6 }: SkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <ImageSkeleton className="h-64 w-full rounded-lg" />
          <ImageSkeleton className="h-4 w-3/4 rounded" />
          <ImageSkeleton className="h-4 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

export function MasonrySkeleton({ className, count = 9 }: SkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <ImageSkeleton
          key={i}
          className="rounded-lg"
          style={{ height: `${MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length]}px` }}
        />
      ))}
    </div>
  );
}
