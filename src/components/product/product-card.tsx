import { ViewTransition } from "react";
import Link from "next/link";

import { brandLabel } from "@/lib/catalog/filters";
import { keySpecs, mediaCaption, stockLabel } from "@/lib/catalog/present";
import { cn, formatVnd } from "@/lib/utils";
import type { ProductWithSpecs } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { FocusFrame } from "@/components/ui/focus-frame";
import { SpecChip } from "@/components/ui/spec-chip";

import { ProductMedia, productMediaTransitionName } from "./product-media";

export function ProductCard({ product, className }: { product: ProductWithSpecs; className?: string }) {
  const stock = stockLabel(product.stock);
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color] duration-300 hover:border-border-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <div className="relative">
        <ViewTransition name={productMediaTransitionName(product.slug)} share="morph" default="none">
          <ProductMedia
            name={product.name}
            category={product.category}
            image={product.images[0]}
            seed={product.slug}
            caption={mediaCaption(product)}
            className="aspect-[4/3]"
          />
        </ViewTransition>
        {/* Keyboard focus ring in EVF style; hover is handled by the focus-pull group. */}
        <FocusFrame className="opacity-0 transition-opacity duration-300 group-focus-visible:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="spec-figure text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {brandLabel(product.brand)}
            </p>
            <h3 className="mt-1 font-semibold leading-snug">{product.name}</h3>
          </div>
          {stock.variant !== "success" && <Badge variant={stock.variant}>{stock.label}</Badge>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keySpecs(product).map(([label, value]) => (
            <SpecChip key={label} label={label} value={value} />
          ))}
        </div>
        <p className="spec-figure mt-auto pt-2 text-base font-semibold">{formatVnd(product.price)}</p>
      </div>
    </Link>
  );
}
