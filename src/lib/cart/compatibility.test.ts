import { describe, expect, it } from "vitest";

import { demoProducts } from "@/lib/catalog/demo-data";

import { checkAddition, checkCartCompatibility } from "./compatibility";
import { toCartProduct, type CartItem } from "./types";

const item = (slug: string): CartItem => {
  const p = demoProducts.find((d) => d.slug === slug);
  if (!p) throw new Error(`unknown slug ${slug}`);
  return { ...toCartProduct(p), quantity: 1 };
};

const a7iv = item("sony-a7-iv");
const zve10 = item("sony-zv-e10-ii");
const r6 = item("canon-eos-r6-mark-ii");
const x100 = item("fujifilm-x100vi");
const fe35 = item("sony-fe-35mm-f1-8");
const sigma1850 = item("sigma-18-50mm-f2-8-dc-dn-e");
const rf50 = item("canon-rf-50mm-f1-8-stm");
const npfz100 = item("sony-np-fz100");
const strap = item("peak-design-slide-lite");

const codes = (items: CartItem[]) => checkCartCompatibility(items).map((i) => `${i.code}:${i.productId}`);

describe("checkCartCompatibility", () => {
  it("accepts a body and lens with the same mount", () => {
    expect(checkCartCompatibility([a7iv, fe35])).toEqual([]);
  });

  it("accepts lenses or accessories without any body", () => {
    expect(checkCartCompatibility([rf50, fe35, npfz100])).toEqual([]);
  });

  it("flags a lens with a different mount as an error", () => {
    const issues = checkCartCompatibility([a7iv, rf50]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", code: "mount-mismatch", productId: rf50.productId });
    expect(issues[0].message).toContain("Canon RF");
    expect(issues[0].message).toContain("Sony E-mount");
  });

  it("accepts a lens when at least one body in the cart fits it", () => {
    expect(checkCartCompatibility([a7iv, r6, rf50, fe35])).toEqual([]);
  });

  it("rejects interchangeable lenses when the only body has a fixed lens", () => {
    expect(codes([x100, fe35])).toEqual([`fixed-lens-body:${fe35.productId}`]);
  });

  it("ignores the fixed-lens body when another body fits", () => {
    expect(checkCartCompatibility([x100, a7iv, fe35])).toEqual([]);
  });

  it("warns about an APS-C lens on a full-frame body", () => {
    const issues = checkCartCompatibility([a7iv, sigma1850]);
    expect(issues).toEqual([
      expect.objectContaining({ level: "warning", code: "crop-lens-on-larger-sensor", productId: sigma1850.productId }),
    ]);
  });

  it("does not warn when an APS-C body in the cart matches the lens format", () => {
    expect(checkCartCompatibility([a7iv, zve10, sigma1850])).toEqual([]);
  });

  it("warns about a mount-specific accessory that fits no body", () => {
    expect(codes([r6, npfz100])).toEqual([`accessory-mismatch:${npfz100.productId}`]);
    expect(checkCartCompatibility([a7iv, npfz100])).toEqual([]);
  });

  it("treats accessories without compatible mounts as universal", () => {
    expect(checkCartCompatibility([r6, strap])).toEqual([]);
  });
});

describe("checkAddition", () => {
  it("reports issues for the lens being added", () => {
    expect(checkAddition([a7iv], rf50).map((i) => i.code)).toEqual(["mount-mismatch"]);
  });

  it("reports nothing for a fitting lens", () => {
    expect(checkAddition([a7iv], fe35)).toEqual([]);
  });

  it("reports existing lenses that a newly added body can't take", () => {
    const issues = checkAddition([rf50], a7iv);
    expect(issues.map((i) => `${i.code}:${i.productId}`)).toEqual([`mount-mismatch:${rf50.productId}`]);
  });

  it("does not repeat issues that existed before the body was added", () => {
    expect(checkAddition([a7iv, rf50], zve10)).toEqual([]);
  });
});
