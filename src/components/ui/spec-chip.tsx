import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Compact label/value pair for technical specs (ISO, aperture, focal length...).
 * Values render in the mono typeface with tabular figures.
 */
function SpecChip({
  label,
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { label: string; value: React.ReactNode }) {
  return (
    <div
      data-slot="spec-chip"
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1",
        className,
      )}
      {...props}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="spec-figure text-xs text-foreground">{value}</span>
    </div>
  );
}

export { SpecChip };
