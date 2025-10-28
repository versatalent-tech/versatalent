// New file: Image skeleton loader component

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageSkeletonProps {
  className?: string;
  aspectRatio?: string;
  animate?: boolean;
}

export function ImageSkeleton({
  className,
  aspectRatio = "aspect-square",
  animate = true
}: ImageSkeletonProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted rounded-lg", aspectRatio, className)}>
      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ["-100%", "100%"]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <ImageSkeleton />
          <div className="mt-2 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function MasonrySkeleton({ count = 8 }: { count?: number }) {
  const heights = ["h-48", "h-64", "h-56", "h-72", "h-52", "h-60", "h-68", "h-54"];

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="break-inside-avoid mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className={cn("relative overflow-hidden bg-muted rounded-lg", heights[i % heights.length])}>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ["-100%", "100%"]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.1
              }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
