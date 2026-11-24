import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";

import { activeFilterCount, buildFacets, clearFilters, filterProducts, filtersHref, parseFilters } from "@/lib/catalog/filters";
import { getCatalog } from "@/lib/catalog/source";
import { ActiveFilters } from "@/components/catalog/active-filters";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { SearchForm } from "@/components/catalog/search-form";
import { SortLinks } from "@/components/catalog/sort-links";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cameras & Lenses",
  description: "Filter camera bodies, lenses and accessories by brand, mount, sensor size, focal length, aperture and price.",
};

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8">
        <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Catalog</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Cameras &amp; Lenses</h1>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Catalog({ searchParams }: Pick<PageProps<"/products">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const catalog = await getCatalog();
  const products = filterProducts(catalog, filters);
  const facets = buildFacets(catalog, filters);
  const activeCount = activeFilterCount(filters);

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">
          <FilterPanel facets={facets} filters={filters} />
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchForm key={filters.q} filters={filters} />
          <SortLinks filters={filters} />
        </div>

        {/* Mobile filters */}
        <details className="group rounded-2xl border border-border bg-card lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeCount > 0 && <span className="spec-figure text-primary">({activeCount})</span>}
            <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
            <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-border p-4">
            <FilterPanel facets={facets} filters={filters} />
          </div>
        </details>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="spec-figure text-foreground">{products.length}</span>{" "}
            {products.length === 1 ? "product" : "products"}
          </p>
        </div>
        <ActiveFilters filters={filters} />

        {products.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <li key={product.id} className="flex">
                <ProductCard product={product} className="w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center">
            <p className="font-medium">Nothing in frame.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              No products match these filters. Try removing one, or start over.
            </p>
            <Button variant="secondary" asChild>
              <Link href={filtersHref(clearFilters(filters))}>Clear filters</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10" aria-busy>
      <div className="hidden space-y-3 lg:block">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-6 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}
