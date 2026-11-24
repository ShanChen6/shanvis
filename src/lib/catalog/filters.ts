import {
  MOUNT_LABELS,

  PRODUCT_CATEGORIES,
  SENSOR_LABELS,

  type MountType,
  type ProductWithSpecs,
  type SensorSize,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* Filter definitions                                                         */
/* -------------------------------------------------------------------------- */

export const FILTER_KEYS = ["category", "brand", "mount", "sensor", "focal", "aperture", "price"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const SORT_OPTIONS = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  newest: "Newest",
} as const;
export type SortOption = keyof typeof SORT_OPTIONS;

export interface CatalogFilters {
  q: string;
  sort: SortOption;
  values: Record<FilterKey, string[]>;
}

interface Range {
  min: number;
  max: number;
}

/** Focal length buckets (mm). A zoom matches every bucket its range overlaps. */
export const FOCAL_BUCKETS = {
  wide: { label: "Wide (< 35mm)", min: 0, max: 34 },
  standard: { label: "Standard (35-70mm)", min: 35, max: 70 },
  tele: { label: "Telephoto (> 70mm)", min: 71, max: Number.POSITIVE_INFINITY },
} as const satisfies Record<string, Range & { label: string }>;

/** "f/x or faster": a lens matches when its max aperture is at most this value. */
export const APERTURE_BUCKETS = {
  "1.4": { label: "f/1.4 or faster", value: 1.4 },
  "2": { label: "f/2 or faster", value: 2 },
  "2.8": { label: "f/2.8 or faster", value: 2.8 },
  "4": { label: "f/4 or faster", value: 4 },
} as const;

/** Price buckets in VND, [min, max). */
export const PRICE_BUCKETS = {
  "under-10m": { label: "Under 10M", min: 0, max: 10_000_000 },
  "10m-25m": { label: "10M - 25M", min: 10_000_000, max: 25_000_000 },
  "25m-50m": { label: "25M - 50M", min: 25_000_000, max: 50_000_000 },
  "over-50m": { label: "Over 50M", min: 50_000_000, max: Number.POSITIVE_INFINITY },
} as const satisfies Record<string, Range & { label: string }>;

const CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  body: "Camera bodies",
  lens: "Lenses",
  accessory: "Accessories",
};

/** Groups where picking an option replaces the previous one. */
const SINGLE_SELECT: ReadonlySet<FilterKey> = new Set(["aperture"]);
/** Groups that only make sense for lenses; selecting one implies category=lens. */
export const LENS_ONLY: ReadonlySet<FilterKey> = new Set(["focal", "aperture"]);

export const FILTER_LABELS: Record<FilterKey, string> = {
  category: "Category",
  brand: "Brand",
  mount: "Mount",
  sensor: "Sensor size",
  focal: "Focal length",
  aperture: "Max aperture",
  price: "Price",
};

const BRAND_SLUG = /^[a-z0-9-]{1,40}$/;

const staticOptions: Record<Exclude<FilterKey, "brand">, Record<string, string>> = {
  category: CATEGORY_LABELS,
  mount: MOUNT_LABELS,
  sensor: SENSOR_LABELS,
  focal: Object.fromEntries(Object.entries(FOCAL_BUCKETS).map(([k, v]) => [k, v.label])),
  aperture: Object.fromEntries(Object.entries(APERTURE_BUCKETS).map(([k, v]) => [k, v.label])),
  price: Object.fromEntries(Object.entries(PRICE_BUCKETS).map(([k, v]) => [k, v.label])),
};

export function brandLabel(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function optionLabel(key: FilterKey, value: string) {
  return key === "brand" ? brandLabel(value) : (staticOptions[key][value] ?? value);
}

function isValidValue(key: FilterKey, value: string) {
  return key === "brand" ? BRAND_SLUG.test(value) : value in staticOptions[key];
}

/* -------------------------------------------------------------------------- */
/* URL <-> filters                                                            */
/* -------------------------------------------------------------------------- */

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function emptyFilters(): CatalogFilters {
  return {
    q: "",
    sort: "featured",
    values: Object.fromEntries(FILTER_KEYS.map((k) => [k, []])) as unknown as CatalogFilters["values"],
  };
}

/** Parse `?brand=sony,canon&mount=sony-e&sort=price-asc`. Unknown values are dropped. */
export function parseFilters(searchParams: SearchParams): CatalogFilters {
  const filters = emptyFilters();

  for (const key of FILTER_KEYS) {
    const raw = searchParams[key];
    const parts = (Array.isArray(raw) ? raw : [raw ?? ""])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v && isValidValue(key, v));
    const unique = [...new Set(parts)];
    filters.values[key] = SINGLE_SELECT.has(key) ? unique.slice(0, 1) : unique;
  }

  const sort = firstParam(searchParams.sort);
  if (sort && sort in SORT_OPTIONS) filters.sort = sort as SortOption;

  filters.q = (firstParam(searchParams.q) ?? "").trim().slice(0, 100);
  return filters;
}

export function toSearchParams(filters: CatalogFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const key of FILTER_KEYS) {
    if (filters.values[key].length) params.set(key, filters.values[key].join(","));
  }
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params;
}

export function filtersHref(filters: CatalogFilters, pathname = "/products") {
  const qs = toSearchParams(filters).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Toggle one option; single-select groups replace their value. */
export function toggleFilter(filters: CatalogFilters, key: FilterKey, value: string): CatalogFilters {
  const current = filters.values[key];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : SINGLE_SELECT.has(key)
      ? [value]
      : [...current, value];
  return { ...filters, values: { ...filters.values, [key]: next } };
}

export function withSort(filters: CatalogFilters, sort: SortOption): CatalogFilters {
  return { ...filters, sort };
}

export function clearFilters(filters: CatalogFilters): CatalogFilters {
  return { ...emptyFilters(), sort: filters.sort };
}

export function activeFilterCount(filters: CatalogFilters) {
  return FILTER_KEYS.reduce((n, k) => n + filters.values[k].length, 0) + (filters.q ? 1 : 0);
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

export function productMount(p: ProductWithSpecs): MountType | null {
  return p.specs && p.specs.kind !== "accessory" ? p.specs.mount_type : null;
}

export function productSensor(p: ProductWithSpecs): SensorSize | null {
  if (!p.specs) return null;
  if (p.specs.kind === "body") return p.specs.sensor_size;
  if (p.specs.kind === "lens") return p.specs.sensor_coverage;
  return null;
}

function matchesOption(p: ProductWithSpecs, key: FilterKey, value: string): boolean {
  const specs = p.specs;
  switch (key) {
    case "category":
      return p.category === value;
    case "brand":
      return p.brand === value;
    case "mount":
      if (specs?.kind === "accessory") return specs.compatible_mounts.includes(value as MountType);
      return productMount(p) === value;
    case "sensor":
      return productSensor(p) === value;
    case "focal": {
      if (specs?.kind !== "lens") return false;
      const b = FOCAL_BUCKETS[value as keyof typeof FOCAL_BUCKETS];
      return specs.focal_min_mm <= b.max && specs.focal_max_mm >= b.min;
    }
    case "aperture":
      return specs?.kind === "lens" && specs.aperture_max <= APERTURE_BUCKETS[value as keyof typeof APERTURE_BUCKETS].value;
    case "price": {
      const b = PRICE_BUCKETS[value as keyof typeof PRICE_BUCKETS];
      return p.price >= b.min && p.price < b.max;
    }
  }
}

function matchesQuery(p: ProductWithSpecs, q: string) {
  if (!q) return true;
  const haystack = `${p.name} ${p.brand} ${p.description ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

/** Options within a group are OR-ed; groups are AND-ed. */
function matches(p: ProductWithSpecs, filters: CatalogFilters, skip?: FilterKey) {
  if (!matchesQuery(p, filters.q)) return false;
  return FILTER_KEYS.every((key) => {
    if (key === skip) return true;
    const selected = filters.values[key];
    return selected.length === 0 || selected.some((v) => matchesOption(p, key, v));
  });
}

const sorters: Record<SortOption, (a: ProductWithSpecs, b: ProductWithSpecs) => number> = {
  featured: (a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
};

export function filterProducts(products: ProductWithSpecs[], filters: CatalogFilters) {
  return products.filter((p) => matches(p, filters)).sort(sorters[filters.sort]);
}

/* -------------------------------------------------------------------------- */
/* Facets                                                                     */
/* -------------------------------------------------------------------------- */

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface Facet {
  key: FilterKey;
  label: string;
  options: FacetOption[];
}

/**
 * Option counts for each group, computed against every *other* active group,
 * so counts show what you'd get by adding that option.
 */
export function buildFacets(products: ProductWithSpecs[], filters: CatalogFilters): Facet[] {
  const brands = [...new Set(products.map((p) => p.brand))].sort();

  return FILTER_KEYS.map((key) => {
    const values = key === "brand" ? brands : Object.keys(staticOptions[key]);
    const pool = products.filter((p) => matches(p, filters, key));
    const options = values.map((value) => ({
      value,
      label: optionLabel(key, value),
      count: pool.filter((p) => matchesOption(p, key, value)).length,
      selected: filters.values[key].includes(value),
    }));
    return { key, label: FILTER_LABELS[key], options };
  });
}
