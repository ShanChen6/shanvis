import Link from "next/link";
import { Aperture } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-bold tracking-[0.2em]", className)}
      aria-label="SHANVIS home"
    >
      <Aperture className="size-5 text-primary" strokeWidth={2.25} />
      <span>SHANVIS</span>
    </Link>
  );
}
