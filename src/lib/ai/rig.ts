import { checkCartCompatibility, type CompatibilityIssue } from "@/lib/cart/compatibility";
import { toCartProduct, type CartProduct } from "@/lib/cart/types";
import { productMount, productSensor } from "@/lib/catalog/filters";
import { formatAperture, formatFocalLength } from "@/lib/specs";
import type { MountType, ProductCategory, ProductWithSpecs, SensorSize } from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* searchCatalog: compact, model-friendly product listing                     */
/* -------------------------------------------------------------------------- */

export interface CatalogSearchInput {
  category?: ProductCategory;
  mount?: MountType;
  sensor?: SensorSize;
  maxPrice?: number;
  /** Lenses only: largest f-number accepted as max aperture (e.g. 2.8 = "f/2.8 or faster"). */
  maxAperture?: number;
  /** Free text matched against name, brand and description. */
  query?: string;
  limit?: number;
}

/** One line per product with what the model needs to reason; no prose. */
export interface CatalogHit {
  slug: string;
  name: string;
  category: ProductCategory;
  priceVnd: number;
  stock: number;
  mount: MountType | null;
  sensor: SensorSize | null;
  specs: string;
}

function summarizeSpecs(p: ProductWithSpecs): string {
  const s = p.specs;
  if (!s) return "";
  switch (s.kind) {
    case "body":
      return [
        `${s.megapixels}MP`,
        `ISO ${s.iso_min}-${s.iso_max}`,
        s.ibis_stops ? `IBIS ${s.ibis_stops} stops` : "no IBIS",
        s.video_max,
        `${s.weight_g}g`,
        s.fixed_lens ? `FIXED LENS ${s.fixed_lens} (no interchangeable lenses)` : null,
      ]
        .filter(Boolean)
        .join(", ");
    case "lens":
      return [
        formatFocalLength(s),
        formatAperture(s.aperture_max),
        s.focal_min_mm === s.focal_max_mm ? "prime" : "zoom",
        s.ois ? "OIS" : null,
        `${s.weight_g}g`,
      ]
        .filter(Boolean)
        .join(", ");
    case "accessory":
      return s.compatible_mounts.length ? `for ${s.compatible_mounts.join("/")}` : "universal";
  }
}

export function searchCatalog(catalog: ProductWithSpecs[], input: CatalogSearchInput): CatalogHit[] {
  const terms = (input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return catalog
    .filter((p) => p.is_active && p.stock > 0)
    .filter((p) => !input.category || p.category === input.category)
    .filter((p) => {
      if (!input.mount) return true;
      if (p.specs?.kind === "accessory") {
        return p.specs.compatible_mounts.length === 0 || p.specs.compatible_mounts.includes(input.mount);
      }
      return productMount(p) === input.mount;
    })
    .filter((p) => !input.sensor || productSensor(p) === input.sensor)
    .filter((p) => input.maxPrice == null || p.price <= input.maxPrice)
    .filter((p) => input.maxAperture == null || (p.specs?.kind === "lens" && p.specs.aperture_max <= input.maxAperture))
    .filter((p) => {
      if (terms.length === 0) return true;
      const hay = `${p.name} ${p.brand} ${p.description ?? ""}`.toLowerCase();
      return terms.some((t) => hay.includes(t));
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, Math.min(input.limit ?? 15, 25))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      priceVnd: p.price,
      stock: p.stock,
      mount: productMount(p),
      sensor: productSensor(p),
      specs: summarizeSpecs(p),
    }));
}

/* -------------------------------------------------------------------------- */
/* proposeRig: server-side validation of a body + lens (+ accessories) kit    */
/* -------------------------------------------------------------------------- */

export interface RigInput {
  title: string;
  /** Why this kit fits the request, in the customer's language. */
  rationale: string;
  bodySlug: string;
  lensSlug?: string;
  accessorySlugs?: string[];
  budgetVnd?: number;
}

export type RigProblem =
  | { code: "unknown-product"; slug: string }
  | { code: "wrong-category"; slug: string; expected: ProductCategory }
  | { code: "out-of-stock"; slug: string }
  | { code: "missing-lens" }
  | { code: "over-budget"; overByVnd: number }
  | { code: "incompatible"; issue: CompatibilityIssue };

export interface RigProposal {
  title: string;
  rationale: string;
  items: CartProduct[];
  totalVnd: number;
  budgetVnd: number | null;
  /** True only when every item exists, is in stock, fits together and is within budget. */
  valid: boolean;
  problems: RigProblem[];
  /** Non-blocking notes (e.g. crop-mode warning). */
  warnings: CompatibilityIssue[];
}

export function proposeRig(catalog: ProductWithSpecs[], input: RigInput): RigProposal {
  const problems: RigProblem[] = [];
  const bySlug = new Map(catalog.filter((p) => p.is_active).map((p) => [p.slug, p]));

  const pick = (slug: string, expected: ProductCategory) => {
    const p = bySlug.get(slug);
    if (!p) {
      problems.push({ code: "unknown-product", slug });
      return null;
    }
    if (p.category !== expected) {
      problems.push({ code: "wrong-category", slug, expected });
      return null;
    }
    if (p.stock <= 0) problems.push({ code: "out-of-stock", slug });
    return p;
  };

  const body = pick(input.bodySlug, "body");
  const lens = input.lensSlug ? pick(input.lensSlug, "lens") : null;
  const accessories = [...new Set(input.accessorySlugs ?? [])]
    .map((slug) => pick(slug, "accessory"))
    .filter((p): p is ProductWithSpecs => p !== null);

  const isFixedLensBody = body?.specs?.kind === "body" && Boolean(body.specs.fixed_lens);
  if (body && !lens && !input.lensSlug && !isFixedLensBody) problems.push({ code: "missing-lens" });

  const products = [body, lens, ...accessories].filter((p): p is ProductWithSpecs => p !== null);
  const items = products.map(toCartProduct);
  const issues = checkCartCompatibility(items);
  // In the cart, an accessory for another mount is only a warning. A kit we
  // recommend must not contain one, so it blocks here.
  const blocking = (i: CompatibilityIssue) => i.level === "error" || i.code === "accessory-mismatch";
  for (const issue of issues.filter(blocking)) problems.push({ code: "incompatible", issue });

  const totalVnd = items.reduce((sum, i) => sum + i.price, 0);
  const budgetVnd = input.budgetVnd ?? null;
  if (budgetVnd != null && totalVnd > budgetVnd) problems.push({ code: "over-budget", overByVnd: totalVnd - budgetVnd });

  return {
    title: input.title,
    rationale: input.rationale,
    items,
    totalVnd,
    budgetVnd,
    valid: problems.length === 0,
    problems,
    warnings: issues.filter((i) => !blocking(i)),
  };
}

/** Plain-English problem list for the model, so it can fix and retry. */
export function describeProblems(problems: RigProblem[]): string[] {
  return problems.map((p) => {
    switch (p.code) {
      case "unknown-product":
        return `No active product with slug "${p.slug}". Use slugs from searchCatalog.`;
      case "wrong-category":
        return `"${p.slug}" is not a ${p.expected}.`;
      case "out-of-stock":
        return `"${p.slug}" is out of stock.`;
      case "missing-lens":
        return "This body takes interchangeable lenses; include a lens with the same mount.";
      case "over-budget":
        return `Total is ${p.overByVnd} VND over budget.`;
      case "incompatible":
        return p.issue.message;
    }
  });
}
