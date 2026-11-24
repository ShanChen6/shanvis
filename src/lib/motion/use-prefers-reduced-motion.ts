"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** True when the user asked for reduced motion. Server render assumes reduced motion. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeHover(callback: () => void) {
  const mql = window.matchMedia(HOVER_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** True on devices with a real hover-capable pointer (not touch). */
export function useCanHover() {
  return useSyncExternalStore(
    subscribeHover,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false,
  );
}
