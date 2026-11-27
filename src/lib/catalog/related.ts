import type { ProductWithSpecs } from "@/types/catalog";

import { productMount } from "./filters";

/**
 * Products that work with `product`: lenses for a body, bodies for a lens,
 * bodies for a mount-specific accessory. In-stock first, then by price.
 */
export function compatibleProducts(product: ProductWithSpecs, catalog: ProductWithSpecs[], limit = 4) {
  const s = product.specs;
  if (!s) return [];

  let matches: ProductWithSpecs[];
  if (s.kind === "body") {
    matches = s.fixed_lens
      ? []
      : catalog.filter((p) => p.category === "lens" && productMount(p) === s.mount_type);
  } else if (s.kind === "lens") {
    matches = catalog.filter(
      (p) => p.specs?.kind === "body" && !p.specs.fixed_lens && p.specs.mount_type === s.mount_type,
    );
  } else {
    matches = s.compatible_mounts.length
      ? catalog.filter((p) => p.category === "body" && s.compatible_mounts.includes(productMount(p)!))
      : [];
  }

  return matches
    .filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.price - b.price)
    .slice(0, limit);
}
