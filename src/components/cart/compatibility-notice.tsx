import { AlertTriangle, CircleX } from "lucide-react";

import type { CompatibilityIssue } from "@/lib/cart/compatibility";
import { cn } from "@/lib/utils";

export function CompatibilityNotice({ issue, className }: { issue: CompatibilityIssue; className?: string }) {
  const isError = issue.level === "error";
  const Icon = isError ? CircleX : AlertTriangle;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed",
        isError ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/10 text-warning",
        className,
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{issue.message}</span>
    </p>
  );
}
