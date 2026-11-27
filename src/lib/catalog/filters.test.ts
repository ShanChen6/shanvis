import { describe, expect, it } from "vitest";

import { demoProducts } from "./demo-data";
import {
  buildFacets,
  emptyFilters,
  filterProducts,
  filtersHref,
  parseFilters,
  toggleFilter,
} from "./filters";

const slugs = (sp: Record<string, string>) => filterProducts(demoProducts, parseFilters(sp)).map((p) => p.slug);

describe("parseFilters", () => {
  it("parses comma lists, lowercases and de-duplicates", () => {
    const f = parseFilters({ brand: "Sony,canon,sony", mount: ["sony-e", "nikon-z"] });
    expect(f.values.brand).toEqual(["sony", "canon"]);
    expect(f.values.mount).toEqual(["sony-e", "nikon-z"]);
  });

  it("drops unknown values and invalid sort", () => {
    const f = parseFilters({ mount: "m42,sony-e", sensor: "huge", sort: "random", brand: "<script>" });
    expect(f.values.mount).toEqual(["sony-e"]);
    expect(f.values.sensor).toEqual([]);
    expect(f.values.brand).toEqual([]);
    expect(f.sort).toBe("featured");
  });

  it("keeps only one value for single-select groups", () => {
    expect(parseFilters({ aperture: "2.8,1.4" }).values.aperture).toEqual(["2.8"]);
  });

  it("round-trips through the URL", () => {
    const f = parseFilters({ brand: "sony", price: "10m-25m", sort: "price-asc", q: "zoom" });
    expect(filtersHref(f)).toBe("/products?q=zoom&brand=sony&price=10m-25m&sort=price-asc");
    expect(filtersHref(emptyFilters())).toBe("/products");
  });
});

describe("filterProducts", () => {
  it("ORs options within a group and ANDs across groups", () => {
    expect(slugs({ brand: "canon,nikon", category: "lens" }).sort()).toEqual([
      "canon-rf-50mm-f1-8-stm",
      "nikon-z-24-120mm-f4-s",
    ]);
  });

  it("matches mount for bodies, lenses and mount-specific accessories", () => {
    expect(slugs({ mount: "sony-e" }).sort()).toEqual([
      "sigma-18-50mm-f2-8-dc-dn-e",
      "sony-a7-iv",
      "sony-fe-24-70mm-f2-8-gm-ii",
      "sony-fe-35mm-f1-8",
      "sony-np-fz100",
      "sony-zv-e10-ii",
    ]);
  });

  it("uses lens coverage for the sensor filter", () => {
    expect(slugs({ sensor: "aps-c", category: "lens" }).sort()).toEqual([
      "fujifilm-xf-23mm-f1-4-r-lm-wr",
      "sigma-18-50mm-f2-8-dc-dn-e",
    ]);
  });

  it("matches zooms in every focal bucket they overlap", () => {
    expect(slugs({ focal: "wide" })).toContain("sony-fe-24-70mm-f2-8-gm-ii");
    expect(slugs({ focal: "standard" })).toContain("sony-fe-24-70mm-f2-8-gm-ii");
    expect(slugs({ focal: "tele" })).toEqual(["nikon-z-24-120mm-f4-s"]);
  });

  it("filters by max aperture as 'or faster'", () => {
    expect(slugs({ aperture: "1.4" })).toEqual(["fujifilm-xf-23mm-f1-4-r-lm-wr"]);
    expect(slugs({ aperture: "2.8" })).not.toContain("nikon-z-24-120mm-f4-s");
  });

  it("filters by price bucket with an exclusive upper bound", () => {
    expect(slugs({ price: "under-10m" }).sort()).toEqual([
      "canon-rf-50mm-f1-8-stm",
      "peak-design-slide-lite",
      "sony-np-fz100",
    ]);
  });

  it("searches name, brand and description", () => {
    expect(slugs({ q: "vlog" }).sort()).toEqual(["sigma-18-50mm-f2-8-dc-dn-e", "sony-zv-e10-ii"]);
  });

  it("sorts by price", () => {
    const prices = filterProducts(demoProducts, parseFilters({ sort: "price-desc" })).map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });
});

describe("buildFacets", () => {
  it("counts each group against the other active groups only", () => {
    const facets = buildFacets(demoProducts, parseFilters({ brand: "sony", category: "lens" }));
    const brand = facets.find((f) => f.key === "brand")!;
    // Brand counts ignore the brand filter but respect category=lens.
    expect(brand.options.find((o) => o.value === "canon")).toMatchObject({ count: 1, selected: false });
    expect(brand.options.find((o) => o.value === "sony")).toMatchObject({ count: 2, selected: true });
    const category = facets.find((f) => f.key === "category")!;
    expect(category.options.find((o) => o.value === "body")?.count).toBe(2);
  });
});

describe("toggleFilter", () => {
  it("adds and removes values, replacing single-select groups", () => {
    let f = toggleFilter(emptyFilters(), "brand", "sony");
    f = toggleFilter(f, "brand", "canon");
    expect(f.values.brand).toEqual(["sony", "canon"]);
    f = toggleFilter(f, "brand", "sony");
    expect(f.values.brand).toEqual(["canon"]);
    f = toggleFilter(toggleFilter(f, "aperture", "2"), "aperture", "1.4");
    expect(f.values.aperture).toEqual(["1.4"]);
  });
});
