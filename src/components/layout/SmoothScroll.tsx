"use client";

import { ReactLenis } from "lenis/react";
import { useSyncExternalStore, type ReactNode } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Server snapshot is "reduced" so SSR never mounts Lenis; it starts on the client.
function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
}

// Lenis ignores overflow:hidden, so a modal that locks <body> would still let
// the page behind it scroll. Skip Lenis while the page is scroll-locked.
function isScrollLocked() {
  return getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(document.documentElement).overflow === "hidden";
}

/* ----------------------------------------------------------------------------
 * Page-wide Lenis smooth scrolling. Nested scroll areas (drawers, tables) keep
 * native scrolling via allowNestedScroll; add data-lenis-prevent to opt out.
 * ------------------------------------------------------------------------- */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis root options={{ autoRaf: true, anchors: true, allowNestedScroll: true, prevent: isScrollLocked }}>
      {children}
    </ReactLenis>
  );
}
