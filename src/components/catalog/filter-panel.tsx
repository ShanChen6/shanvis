import Link from "next/link";
import { Check } from "lucide-react";

import {
  LENS_ONLY,
  filtersHref,
  toggleFilter,
  type CatalogFilters,
  type Facet,
} from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

/** Server-rendered filter groups. Every option is a plain link, so filtering works without JavaScript. */
export function FilterPanel({ facets, filters }: { facets: Facet[]; filters: CatalogFilters }) {
  return (
    <div className="space-y-7">
      {facets.map((facet) => (
        <fieldset key={facet.key}>
          <legend className="mb-2.5 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {facet.label}
            {LENS_ONLY.has(facet.key) && (
              <span className="text-[10px] font-normal normal-case tracking-normal">lenses only</span>
            )}
          </legend>
          <ul className="space-y-0.5">
            {facet.options.map((option) => {
              const disabled = option.count === 0 && !option.selected;
              const content = (
                <>
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      option.selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
                    )}
                    aria-hidden
                  >
                    {option.selected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                  <span className="spec-figure text-xs text-muted-foreground">{option.count}</span>
                </>
              );
              const base = "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm";
              return (
                <li key={option.value}>
                  {disabled ? (
                    <span className={cn(base, "cursor-not-allowed opacity-40")} aria-disabled>
                      {content}
                    </span>
                  ) : (
                    <Link
                      href={filtersHref(toggleFilter(filters, facet.key, option.value))}
                      scroll={false}
                      aria-current={option.selected ? "true" : undefined}
                      className={cn(base, "transition-colors hover:bg-accent", option.selected && "text-foreground")}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
