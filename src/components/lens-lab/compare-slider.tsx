"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Before/after comparison. Drag anywhere on the frame or use the keyboard
 * (it's a native range input underneath).
 *
 * The split is done with transforms only: the left scene sits in a wrapper
 * shifted left by (100 - split)% with overflow hidden, and the scene itself
 * is shifted back by the same amount. Dragging moves two composited layers
 * instead of re-clipping (and re-blurring) the scene on every pointer move.
 */
export function CompareSlider({
  left,
  right,
  leftLabel,
  rightLabel,
  label,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel: React.ReactNode;
  rightLabel: React.ReactNode;
  /** Accessible name for the slider. */
  label: string;
  className?: string;
}) {
  const frame = React.useRef<HTMLDivElement>(null);
  const [split, setSplit] = React.useState(50);
  const dragging = React.useRef(false);

  const setFromPointer = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={frame}
      className={cn(
        "relative touch-pan-y select-none overflow-hidden rounded-3xl border border-border bg-black",
        className,
      )}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromPointer(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && setFromPointer(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="absolute inset-0">{right}</div>
      <div className="absolute inset-0 overflow-hidden will-change-transform" style={{ transform: `translateX(${split - 100}%)` }}>
        <div className="absolute inset-0 will-change-transform" style={{ transform: `translateX(${100 - split}%)` }}>
          {left}
        </div>
      </div>

      {/* Divider: a full-width layer moved by split%, with the line on its left edge */}
      <div className="pointer-events-none absolute inset-0 will-change-transform" style={{ transform: `translateX(${split}%)` }}>
        <div className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-white/80">
          <div className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/50">
            <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>

      <span className="spec-figure pointer-events-none absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur">
        {leftLabel}
      </span>
      <span className="spec-figure pointer-events-none absolute right-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur">
        {rightLabel}
      </span>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(split)}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={`${Math.round(split)}% left`}
        className="peer absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-ring/60 peer-focus-visible:ring-[3px]" />
    </div>
  );
}
