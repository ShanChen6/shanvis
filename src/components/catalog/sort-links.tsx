import Link from "next/link";

import { SORT_OPTIONS, filtersHref, withSort, type CatalogFilters, type SortOption } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

export function SortLinks({ filters }: { filters: CatalogFilters }) {
  return (
    <nav aria-label="Sort products" className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs text-muted-foreground">Sort</span>
      {(Object.keys(SORT_OPTIONS) as SortOption[]).map((sort) => (
        <Link
          key={sort}
          href={filtersHref(withSort(filters, sort))}
          scroll={false}
          aria-current={filters.sort === sort ? "true" : undefined}
          className={cn(
            "rounded-full px-3 py-1 text-xs transition-colors",
            filters.sort === sort
              ? "bg-secondary text-foreground ring-1 ring-border-strong"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {SORT_OPTIONS[sort]}
        </Link>
      ))}
    </nav>
  );
}
