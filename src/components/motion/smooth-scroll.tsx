"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { setLenis } from "@/lib/motion/lenis";
import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Inertial smooth scrolling with Lenis, driven by GSAP's ticker so
 * ScrollTrigger animations stay in sync. Disabled for reduced motion.
 */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.11,
      // Let scrollable children (cart drawer, filter sidebar) scroll natively.
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [reduced]);

  return null;
}
