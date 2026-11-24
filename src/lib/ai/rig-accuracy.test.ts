/**
 * Mount-pairing accuracy of the AI Rig Builder's server-side validation.
 * Every body x lens and body x accessory pair in the catalog is checked
 * against an independent oracle written straight from the spec data, so a
 * regression in the compatibility rules shows up as a concrete pair.
 */
import { describe, expect, it } from "vitest";

import { checkCartCompatibility } from "@/lib/cart/compatibility";
import { toCartProduct } from "@/lib/cart/types";
import { demoProducts } from "@/lib/catalog/demo-data";
import { MOUNT_TYPES, type ProductWithSpecs } from "@/types/catalog";

import { proposeRig, searchCatalog } from "./rig";

const base = { title: "Kit", rationale: "test" };
const bodies = demoProducts.filter((p) => p.specs?.kind === "body");
const lenses = demoProducts.filter((p) => p.specs?.kind === "lens");
const accessories = demoProducts.filter((p) => p.specs?.kind === "accessory");

const bodySpec = (p: ProductWithSpecs) => (p.specs?.kind === "body" ? p.specs : null)!;
const lensSpec = (p: ProductWithSpecs) => (p.specs?.kind === "lens" ? p.specs : null)!;
const accessorySpec = (p: ProductWithSpecs) => (p.specs?.kind === "accessory" ? p.specs : null)!;

/** Oracle: a lens works on a body when the body takes lenses and the mounts match. */
const lensFits = (body: ProductWithSpecs, lens: ProductWithSpecs) =>
  !bodySpec(body).fixed_lens && bodySpec(body).mount_type === lensSpec(lens).mount_type;

/** Physical sensor sizes, smallest first. */
const SIZE_ORDER = ["micro-four-thirds", "aps-c", "full-frame", "medium-format"];

/** Oracle: a lens made for a smaller sensor works on a fitting body, in crop mode. */
const cropMode = (body: ProductWithSpecs, lens: ProductWithSpecs) =>
  lensFits(body, lens) && SIZE_ORDER.indexOf(bodySpec(body).sensor_size) > SIZE_ORDER.indexOf(lensSpec(lens).sensor_coverage);

/** Oracle: universal accessories fit everything; others need the body's mount. */
const accessoryFits = (body: ProductWithSpecs, acc: ProductWithSpecs) => {
  const mounts = accessorySpec(acc).compatible_mounts;
  return mounts.length === 0 || mounts.includes(bodySpec(body).mount_type);
};

const pairs = <A, B>(as: A[], bs: B[]) => as.flatMap((a) => bs.map((b) => [a, b] as const));

describe("catalog under test", () => {
  it("covers several mounts, a fixed-lens body, a crop lens and mount-specific accessories", () => {
    expect(new Set(bodies.map((b) => bodySpec(b).mount_type)).size).toBeGreaterThanOrEqual(4);
    expect(bodies.some((b) => bodySpec(b).fixed_lens)).toBe(true);
    expect(pairs(bodies, lenses).some(([b, l]) => cropMode(b, l))).toBe(true);
    expect(accessories.some((a) => accessorySpec(a).compatible_mounts.length > 0)).toBe(true);
    expect(demoProducts.every((p) => p.stock > 0)).toBe(true);
  });
});

describe("proposeRig body x lens matrix", () => {
  const matrix = pairs(bodies, lenses);

  it.each(matrix.map(([b, l]) => [b.slug, l.slug, lensFits(b, l)] as const))("%s + %s -> valid=%s", (bodySlug, lensSlug, expected) => {
    const rig = proposeRig(demoProducts, { ...base, bodySlug, lensSlug });
    expect(rig.valid).toBe(expected);
    if (!expected) expect(rig.problems.every((p) => p.code === "incompatible")).toBe(true);
  });

  it("warns (without blocking) exactly when the lens covers a smaller sensor than the body", () => {
    for (const [body, lens] of matrix) {
      const rig = proposeRig(demoProducts, { ...base, bodySlug: body.slug, lensSlug: lens.slug });
      expect(rig.warnings.some((w) => w.code === "crop-lens-on-larger-sensor"), `${body.slug} + ${lens.slug}`).toBe(cropMode(body, lens));
    }
  });

  it("agrees with the smart cart: a kit is valid iff the cart shows no errors for it", () => {
    for (const [body, lens] of matrix) {
      const rig = proposeRig(demoProducts, { ...base, bodySlug: body.slug, lensSlug: lens.slug });
      const cartErrors = checkCartCompatibility([body, lens].map(toCartProduct)).filter((i) => i.level === "error");
      expect(rig.valid, `${body.slug} + ${lens.slug}`).toBe(cartErrors.length === 0);
    }
  });

  it("has at least one valid lens for every interchangeable-lens body", () => {
    for (const body of bodies.filter((b) => !bodySpec(b).fixed_lens)) {
      expect(lenses.some((l) => proposeRig(demoProducts, { ...base, bodySlug: body.slug, lensSlug: l.slug }).valid), body.slug).toBe(true);
    }
  });
});

describe("proposeRig body-only kits", () => {
  it.each(bodies.map((b) => [b.slug, Boolean(bodySpec(b).fixed_lens)] as const))("%s alone -> valid=%s", (bodySlug, fixed) => {
    const rig = proposeRig(demoProducts, { ...base, bodySlug });
    expect(rig.valid).toBe(fixed);
    if (!fixed) expect(rig.problems).toEqual([{ code: "missing-lens" }]);
  });
});

describe("proposeRig body x accessory matrix", () => {
  it("accepts an accessory exactly when it is universal or made for the body's mount", () => {
    for (const [body, acc] of pairs(bodies, accessories)) {
      const lens = bodySpec(body).fixed_lens ? undefined : lenses.find((l) => lensFits(body, l))?.slug;
      const rig = proposeRig(demoProducts, { ...base, bodySlug: body.slug, lensSlug: lens, accessorySlugs: [acc.slug] });
      expect(rig.valid, `${body.slug} + ${acc.slug}`).toBe(accessoryFits(body, acc));
    }
  });
});

describe("proposeRig stock and catalog state", () => {
  const withStock = (slug: string, stock: number) => demoProducts.map((p) => (p.slug === slug ? { ...p, stock } : p));

  it("rejects a matching kit when either item is out of stock", () => {
    expect(proposeRig(withStock("sony-a7-iv", 0), { ...base, bodySlug: "sony-a7-iv", lensSlug: "sony-fe-35mm-f1-8" })).toMatchObject({
      valid: false,
      problems: [{ code: "out-of-stock", slug: "sony-a7-iv" }],
    });
    expect(proposeRig(withStock("sony-fe-35mm-f1-8", 0), { ...base, bodySlug: "sony-a7-iv", lensSlug: "sony-fe-35mm-f1-8" }).valid).toBe(false);
  });

  it("rejects hidden products", () => {
    const catalog = demoProducts.map((p) => (p.slug === "sony-fe-35mm-f1-8" ? { ...p, is_active: false } : p));
    expect(proposeRig(catalog, { ...base, bodySlug: "sony-a7-iv", lensSlug: "sony-fe-35mm-f1-8" }).problems).toEqual([
      { code: "unknown-product", slug: "sony-fe-35mm-f1-8" },
    ]);
  });
});

describe("searchCatalog mount filter (what the agent sees)", () => {
  it.each(MOUNT_TYPES.map((m) => [m]))("mount=%s returns only bodies and lenses with that mount", (mount) => {
    const hits = searchCatalog(demoProducts, { mount, limit: 25 });
    const products = hits.map((h) => demoProducts.find((p) => p.slug === h.slug)!);
    for (const p of products) {
      if (p.specs?.kind === "accessory") expect(p.specs.compatible_mounts.length === 0 || p.specs.compatible_mounts.includes(mount)).toBe(true);
      else expect(p.specs?.mount_type, p.slug).toBe(mount);
    }
    // Nothing that fits is left out.
    const expected = demoProducts.filter((p) => p.specs?.kind !== "accessory" && p.specs?.mount_type === mount).map((p) => p.slug);
    expect(hits.map((h) => h.slug)).toEqual(expect.arrayContaining(expected));
  });
});
