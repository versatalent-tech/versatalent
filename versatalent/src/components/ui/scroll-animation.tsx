"use client";

import { ReactNode } from "react";
import { motion, Variants } from "framer-motion";

// Default animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.5
    }
  }
};

interface ScrollAnimationProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
  viewport?: { once?: boolean; amount?: number };
  animation?:
    | "fadeIn"
    | "fadeInUp"
    | "fadeInLeft"
    | "fadeInRight"
    | "scaleIn"
    | "staggerChildren";
  whileHover?: string | Record<string, unknown>;
  whileTap?: string | Record<string, unknown>;
}

export function ScrollAnimation({
  children,
  className = "",
  variants,
  delay = 0,
  duration = 0.6,
  once = true,
  threshold = 0.1,
  viewport,
  animation = "fadeInUp",
  whileHover,
  whileTap
}: ScrollAnimationProps) {
  // Select the animation variant
  let selectedVariant: Variants;
  switch (animation) {
    case "fadeIn":
      selectedVariant = fadeIn;
      break;
    case "fadeInUp":
      selectedVariant = fadeInUp;
      break;
    case "fadeInLeft":
      selectedVariant = fadeInLeft;
      break;
    case "fadeInRight":
      selectedVariant = fadeInRight;
      break;
    case "scaleIn":
      selectedVariant = scaleIn;
      break;
    case "staggerChildren":
      selectedVariant = staggerContainer;
      break;
    default:
      selectedVariant = fadeInUp;
  }

  // Override with custom variants if provided
  const variantsToUse = variants || selectedVariant;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, threshold, ...viewport }}
      variants={variantsToUse}
      transition={{ duration, delay }}
      whileHover={whileHover}
      whileTap={whileTap}
    >
      {children}
    </motion.div>
  );
}
