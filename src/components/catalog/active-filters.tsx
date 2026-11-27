import Link from "next/link";
import { X } from "lucide-react";

import {
  FILTER_KEYS,
  clearFilters,
  filtersHref,
  optionLabel,
  toggleFilter,
  type CatalogFilters,
} from "@/lib/catalog/filters";

export function ActiveFilters({ filters }: { filters: CatalogFilters }) {
  const chips = FILTER_KEYS.flatMap((key) =>
    filters.values[key].map((value) => ({
      key: `${key}:${value}`,
      label: optionLabel(key, value),
      href: filtersHref(toggleFilter(filters, key, value)),
    })),
  );
  if (filters.q) {
    chips.unshift({ key: "q", label: `“${filters.q}”`, href: filtersHref({ ...filters, q: "" }) });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-2 text-xs text-primary transition-colors hover:bg-primary/20"
        >
          {chip.label}
          <X className="size-3" aria-label="Remove filter" />
        </Link>
      ))}
      <Link
        href={filtersHref(clearFilters(filters))}
        scroll={false}
        className="px-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
