import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Four EVF-style corner brackets drawn around the parent.
 * The parent must be `relative`. Used for the "focus pull" hover state.
 */
function FocusFrame({
  className,
  inset = 12,
  size = 18,
  ...props
}: React.ComponentProps<"div"> & { inset?: number; size?: number }) {
  const corner = "absolute border-primary";
  const style = { width: size, height: size };
  return (
    <div
      aria-hidden
      data-slot="focus-frame"
      className={cn("pointer-events-none absolute", className)}
      style={{ inset }}
      {...props}
    >
      <span className={cn(corner, "left-0 top-0 border-l-2 border-t-2")} style={style} />
      <span className={cn(corner, "right-0 top-0 border-r-2 border-t-2")} style={style} />
      <span className={cn(corner, "bottom-0 left-0 border-b-2 border-l-2")} style={style} />
      <span className={cn(corner, "bottom-0 right-0 border-b-2 border-r-2")} style={style} />
    </div>
  );
}

export { FocusFrame };
