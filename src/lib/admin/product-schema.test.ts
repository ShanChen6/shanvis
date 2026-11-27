import { describe, expect, it } from "vitest";

import { formDataToObject, productFormSchema, slugify } from "./product-schema";

describe("slugify", () => {
  it("strips Vietnamese diacritics and punctuation", () => {
    expect(slugify("Ống kính Đa Năng 24-70mm f/2.8!")).toBe("ong-kinh-da-nang-24-70mm-f-2-8");
  });
});

describe("productFormSchema", () => {
  it("builds lens specs from form strings and derives slug/brand", () => {
    const form = new FormData();
    Object.entries({
      category: "lens", name: "Viltrox AF 27mm F1.2 Pro", slug: "", brand: "Viltrox", price: "9990000", stock: "4",
      mount_type: "fujifilm-x", sensor_coverage: "aps-c", focal_min_mm: "27", focal_max_mm: "27",
      aperture_max: "1.2", aperture_min: "16", ois: "on", weight_g: "530",
    }).forEach(([k, v]) => form.append(k, v));
    const p = productFormSchema.parse(formDataToObject(form));
    expect(p).toMatchObject({ slug: "viltrox-af-27mm-f1-2-pro", brand: "viltrox", price: 9_990_000, description: null });
    expect(p.specs).toEqual({
      kind: "lens", mount_type: "fujifilm-x", sensor_coverage: "aps-c", focal_min_mm: 27, focal_max_mm: 27,
      aperture_max: 1.2, aperture_min: 16, ois: true, weight_g: 530,
    });
  });

  it("collects multiple compatible mounts for accessories", () => {
    const form = new FormData();
    form.append("category", "accessory"); form.append("name", "Lens cap"); form.append("slug", ""); form.append("brand", "x");
    form.append("price", "100000"); form.append("stock", "1");
    form.append("compatible_mounts", "sony-e"); form.append("compatible_mounts", "nikon-z");
    expect(productFormSchema.parse(formDataToObject(form)).specs).toEqual({ kind: "accessory", compatible_mounts: ["sony-e", "nikon-z"] });
  });

  it("rejects inconsistent specs", () => {
    const lens = {
      category: "lens", name: "Bad", slug: "", brand: "x", price: "1", stock: "1", mount_type: "sony-e", sensor_coverage: "aps-c",
      focal_min_mm: "50", focal_max_mm: "35", aperture_max: "1.8", aperture_min: "22", weight_g: "100",
    };
    const r = productFormSchema.safeParse(lens);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["focal_max_mm"]);
    expect(productFormSchema.safeParse({ ...lens, focal_max_mm: "50", mount_type: "m42" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...lens, focal_max_mm: "50", price: "-1" }).success).toBe(false);
  });
});
