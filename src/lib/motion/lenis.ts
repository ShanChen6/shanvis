import type Lenis from "lenis";

/**
 * Module-level handle to the active Lenis instance so other client code
 * (e.g. modal dialogs) can pause smooth scrolling.
 */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}
