"use client";

import { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";

interface ScrollAnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
  animation?:
    | "fadeIn"
    | "fadeInUp"
    | "fadeInLeft"
    | "fadeInRight"
    | "scaleIn"
    | "staggerChildren";
}

const animationClasses: Record<string, string> = {
  fadeIn: "animate-in fade-in",
  fadeInUp: "animate-in fade-in slide-in-from-bottom-4",
  fadeInLeft: "animate-in fade-in slide-in-from-left-4",
  fadeInRight: "animate-in fade-in slide-in-from-right-4",
  scaleIn: "animate-in fade-in zoom-in-95",
  staggerChildren: "animate-in fade-in",
};

export function ScrollAnimation({
  children,
  className = "",
  delay = 0,
  duration = 600,
  once = true,
  threshold = 0.1,
  animation = "fadeInUp",
}: ScrollAnimationProps) {
  const { ref, inView } = useInView({
    threshold,
    triggerOnce: once,
  });

  const animationClass = animationClasses[animation] || animationClasses.fadeInUp;

  return (
    <div
      ref={ref}
      className={cn(
        className,
        "transition-all",
        inView ? animationClass : "opacity-0 translate-y-4"
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Export empty variants for backward compatibility
export const fadeIn = {};
export const fadeInUp = {};
export const fadeInLeft = {};
export const fadeInRight = {};
export const staggerContainer = {};
export const scaleIn = {};
