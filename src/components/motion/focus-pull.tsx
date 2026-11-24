"use client";

import * as React from "react";
import { AnimatePresence, motion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";
import { useCanHover, usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";

/**
 * EVF "focus pull": hovering one item in the group racks focus onto it.
 * The other items soften (blur + dim), and the hovered one shows AF corners
 * locking on plus a quick-spec readout, like an electronic viewfinder.
 */

interface FocusPullContextValue {
  active: string | null;
  setActive: (id: string | null) => void;
  pull: boolean;
  reduced: boolean;
}

const FocusPullContext = React.createContext<FocusPullContextValue | null>(null);

export function FocusPullGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  const [active, setActive] = React.useState<string | null>(null);
  const canHover = useCanHover();
  const reduced = usePrefersReducedMotion();
  const value = React.useMemo(
    () => ({ active, setActive, pull: canHover && !reduced, reduced }),
    [active, canHover, reduced],
  );

  return (
    <FocusPullContext.Provider value={value}>
      <ul className={className} onPointerLeave={() => setActive(null)}>
        {children}
      </ul>
    </FocusPullContext.Provider>
  );
}

const lockSpring: Transition = { type: "spring", stiffness: 520, damping: 30, mass: 0.6 };

export function FocusPullItem({
  id,
  readout,
  className,
  children,
}: {
  id: string;
  /** Short [label, value] pairs shown along the bottom of the frame. */
  readout?: [string, string][];
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(FocusPullContext);
  if (!ctx) throw new Error("FocusPullItem must be inside <FocusPullGroup>");
  const { active, setActive, pull, reduced } = ctx;

  const isActive = active === id;
  const isDefocused = pull && active !== null && !isActive;

  return (
    <motion.li
      className={cn("relative", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setActive(id)}
      onFocusCapture={() => setActive(id)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
      }}
      initial={false}
      animate={{
        filter: isDefocused ? "blur(3px)" : "blur(0px)",
        opacity: isDefocused ? 0.45 : 1,
        scale: isDefocused ? 0.985 : 1,
      }}
      transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="evf"
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3] overflow-hidden rounded-t-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
          >
            {/* AF corners rack in from wide and lock */}
            <motion.div
              className="absolute inset-3"
              initial={reduced ? false : { scale: 1.12, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={lockSpring}
            >
              {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"] as const).map(
                (pos) => (
                  <span key={pos} className={cn("absolute size-5 border-primary", pos)} />
                ),
              )}
            </motion.div>

            {/* Focus-confirm indicator */}
            <motion.div
              className="spec-figure absolute left-5 top-5 flex items-center gap-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-success backdrop-blur-sm"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.12, duration: 0.1 }}
            >
              <span className="size-1.5 rounded-full bg-success" />
              AF
            </motion.div>

            {readout && readout.length > 0 && (
              <motion.div
                className="spec-figure absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-3 gap-y-1 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 text-[11px] text-foreground"
                initial={reduced ? false : { y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...lockSpring, delay: reduced ? 0 : 0.05 }}
              >
                {readout.map(([label, value]) => (
                  <span key={`${label}:${value}`} className="whitespace-nowrap">
                    {label && <span className="text-muted-foreground">{label} </span>}
                    {value}
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
