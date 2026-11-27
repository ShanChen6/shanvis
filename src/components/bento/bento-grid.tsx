import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { FocusFrame } from "@/components/ui/focus-frame";

function BentoGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(
        "grid grid-cols-1 sm:auto-rows-[minmax(14rem,auto)] gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const bentoCardVariants = cva(
  "group relative isolate flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-[border-color,transform] duration-300 hover:border-border-strong",
  {
    variants: {
      span: {
        "1x1": "",
        "2x1": "sm:col-span-2",
        "1x2": "sm:row-span-2",
        "2x2": "sm:col-span-2 sm:row-span-2",
        full: "sm:col-span-2 lg:col-span-4",
      },
    },
    defaultVariants: { span: "1x1" },
  },
);

function BentoCard({
  className,
  span,
  focusable = false,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bentoCardVariants> & {
    /** Show EVF focus corners on hover. */
    focusable?: boolean;
  }) {
  return (
    <div data-slot="bento-card" className={cn(bentoCardVariants({ span }), className)} {...props}>
      {children}
      {focusable && (
        <FocusFrame className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
    </div>
  );
}

function BentoEyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "spec-figure text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { BentoGrid, BentoCard, BentoEyebrow, bentoCardVariants };
