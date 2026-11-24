import { describe, expect, it } from "vitest";

import { demoProducts } from "@/lib/catalog/demo-data";

import { describeProblems, proposeRig, searchCatalog } from "./rig";

const base = { title: "Test kit", rationale: "because" };

describe("searchCatalog", () => {
  it("returns only in-stock products matching all filters, cheapest first", () => {
    const hits = searchCatalog(demoProducts, { category: "lens", mount: "sony-e", maxPrice: 15_000_000 });
    expect(hits.map((h) => h.slug)).toEqual(["sony-fe-35mm-f1-8", "sigma-18-50mm-f2-8-dc-dn-e"]);
    expect(hits[0].specs).toContain("f/1.8");
  });

  it("includes universal accessories when filtering by mount", () => {
    const slugs = searchCatalog(demoProducts, { category: "accessory", mount: "canon-rf" }).map((h) => h.slug);
    expect(slugs).toEqual(["peak-design-slide-lite"]);
  });

  it("flags fixed-lens bodies in the spec summary", () => {
    const [x100] = searchCatalog(demoProducts, { query: "x100vi" });
    expect(x100.specs).toMatch(/FIXED LENS/);
  });

  it("filters lenses by max aperture", () => {
    const slugs = searchCatalog(demoProducts, { maxAperture: 1.8 }).map((h) => h.slug);
    expect(slugs.sort()).toEqual(["canon-rf-50mm-f1-8-stm", "fujifilm-xf-23mm-f1-4-r-lm-wr", "sony-fe-35mm-f1-8"]);
  });

  it("caps the result size", () => {
    expect(searchCatalog(demoProducts, { limit: 100 }).length).toBeLessThanOrEqual(25);
  });
});

describe("proposeRig", () => {
  it("accepts a same-mount kit within budget", () => {
    const rig = proposeRig(demoProducts, {
      ...base,
      bodySlug: "sony-zv-e10-ii",
      lensSlug: "sigma-18-50mm-f2-8-dc-dn-e",
      budgetVnd: 40_000_000,
    });
    expect(rig.valid).toBe(true);
    expect(rig.totalVnd).toBe(24_990_000 + 13_990_000);
    expect(rig.items.map((i) => i.slug)).toEqual(["sony-zv-e10-ii", "sigma-18-50mm-f2-8-dc-dn-e"]);
  });

  it("rejects a mount mismatch", () => {
    const rig = proposeRig(demoProducts, { ...base, bodySlug: "sony-a7-iv", lensSlug: "canon-rf-50mm-f1-8-stm" });
    expect(rig.valid).toBe(false);
    expect(rig.problems.map((p) => p.code)).toEqual(["incompatible"]);
    expect(describeProblems(rig.problems)[0]).toContain("won't fit");
  });

  it("rejects kits over budget and reports by how much", () => {
    const rig = proposeRig(demoProducts, {
      ...base,
      bodySlug: "sony-zv-e10-ii",
      lensSlug: "sigma-18-50mm-f2-8-dc-dn-e",
      budgetVnd: 35_000_000,
    });
    expect(rig.problems).toEqual([{ code: "over-budget", overByVnd: 3_980_000 }]);
  });

  it("rejects unknown slugs and wrong categories", () => {
    const rig = proposeRig(demoProducts, { ...base, bodySlug: "sony-fe-35mm-f1-8", lensSlug: "made-up-lens" });
    expect(rig.problems.map((p) => p.code).sort()).toEqual(["unknown-product", "wrong-category"]);
  });

  it("requires a lens for interchangeable-lens bodies but not fixed-lens ones", () => {
    expect(proposeRig(demoProducts, { ...base, bodySlug: "sony-a7-iv" }).problems).toEqual([{ code: "missing-lens" }]);
    expect(proposeRig(demoProducts, { ...base, bodySlug: "fujifilm-x100vi" }).valid).toBe(true);
  });

  it("keeps crop-mode notes as warnings, not problems", () => {
    const rig = proposeRig(demoProducts, { ...base, bodySlug: "sony-a7-iv", lensSlug: "sigma-18-50mm-f2-8-dc-dn-e" });
    expect(rig.valid).toBe(true);
    expect(rig.warnings.map((w) => w.code)).toEqual(["crop-lens-on-larger-sensor"]);
  });

  it("blocks accessories made for another mount, allows universal ones", () => {
    const kit = { ...base, bodySlug: "canon-eos-r6-mark-ii", lensSlug: "canon-rf-50mm-f1-8-stm" };
    const bad = proposeRig(demoProducts, { ...kit, accessorySlugs: ["sony-np-fz100", "peak-design-slide-lite"] });
    expect(bad.valid).toBe(false);
    expect(bad.problems).toEqual([expect.objectContaining({ code: "incompatible" })]);
    expect(proposeRig(demoProducts, { ...kit, accessorySlugs: ["peak-design-slide-lite"] }).valid).toBe(true);
  });
});
