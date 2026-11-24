import { Search } from "lucide-react";

import { FILTER_KEYS, toSearchParams, type CatalogFilters } from "@/lib/catalog/filters";

/** Plain GET form: keeps the current filters as hidden fields and replaces `q`. */
export function SearchForm({ filters }: { filters: CatalogFilters }) {
  const params = toSearchParams(filters);
  return (
    <form action="/products" role="search" className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        defaultValue={filters.q}
        placeholder="Search cameras, lenses..."
        aria-label="Search products"
        className="flex h-10 w-full rounded-full border border-input bg-muted pl-10 pr-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />
      {[...FILTER_KEYS, "sort" as const].map((key) => {
        const value = params.get(key);
        return value ? <input key={key} type="hidden" name={key} value={value} /> : null;
      })}
    </form>
  );
}
