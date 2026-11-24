import { z } from "zod";

import { MOUNT_TYPES, SENSOR_SIZES, type CameraSpecs } from "@/types/catalog";

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const optionalNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(min).max(max).nullable());

const base = z.object({
  name: z.string().trim().min(2, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Slug: lowercase letters, numbers and dashes only."),
  brand: z.string().trim().min(1, "Brand is required.").max(40),
  price: int(0, 2_000_000_000),
  stock: int(0, 100_000),
  description: z.string().trim().max(2000).optional().default(""),
});

const body = base.extend({
  category: z.literal("body"),
  mount_type: z.enum(MOUNT_TYPES),
  sensor_size: z.enum(SENSOR_SIZES),
  megapixels: num(1, 400),
  iso_min: int(1, 1_000_000),
  iso_max: int(1, 10_000_000),
  ibis_stops: optionalNum(0, 12),
  video_max: z.string().trim().min(1, "Max video is required.").max(40),
  weight_g: int(1, 20_000),
  fixed_lens: z.string().trim().max(40).optional().default(""),
});

const lens = base.extend({
  category: z.literal("lens"),
  mount_type: z.enum(MOUNT_TYPES),
  sensor_coverage: z.enum(SENSOR_SIZES),
  focal_min_mm: num(1, 2000),
  focal_max_mm: num(1, 2000),
  aperture_max: num(0.7, 64),
  aperture_min: num(0.7, 64),
  ois: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
  weight_g: int(1, 20_000),
});

const accessory = base.extend({
  category: z.literal("accessory"),
  compatible_mounts: z.preprocess((v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(MOUNT_TYPES))),
  accessory_type: z.string().trim().max(40).optional().default(""),
});

export const productFormSchema = z
  .discriminatedUnion("category", [body, lens, accessory])
  .superRefine((v, ctx) => {
    if (v.category === "body" && v.iso_max < v.iso_min) ctx.addIssue({ code: "custom", path: ["iso_max"], message: "Max ISO must be ≥ min ISO." });
    if (v.category === "lens" && v.focal_max_mm < v.focal_min_mm)
      ctx.addIssue({ code: "custom", path: ["focal_max_mm"], message: "Max focal length must be ≥ min." });
    if (v.category === "lens" && v.aperture_min < v.aperture_max)
      ctx.addIssue({ code: "custom", path: ["aperture_min"], message: "Min aperture (e.g. f/22) must be ≥ max aperture (e.g. f/1.8)." });
  })
  .transform((v) => {
    let specs: CameraSpecs;
    if (v.category === "body") {
      specs = {
        kind: "body",
        mount_type: v.mount_type,
        sensor_size: v.sensor_size,
        megapixels: v.megapixels,
        iso_min: v.iso_min,
        iso_max: v.iso_max,
        ibis_stops: v.ibis_stops,
        video_max: v.video_max,
        weight_g: v.weight_g,
        ...(v.fixed_lens ? { fixed_lens: v.fixed_lens } : {}),
      };
    } else if (v.category === "lens") {
      specs = {
        kind: "lens",
        mount_type: v.mount_type,
        sensor_coverage: v.sensor_coverage,
        focal_min_mm: v.focal_min_mm,
        focal_max_mm: v.focal_max_mm,
        aperture_max: v.aperture_max,
        aperture_min: v.aperture_min,
        ois: v.ois,
        weight_g: v.weight_g,
      };
    } else {
      specs = { kind: "accessory", compatible_mounts: v.compatible_mounts, ...(v.accessory_type ? { type: v.accessory_type } : {}) };
    }
    return {
      slug: v.slug || slugify(v.name),
      name: v.name,
      brand: slugify(v.brand),
      category: v.category,
      price: v.price,
      stock: v.stock,
      description: v.description || null,
      images: [] as string[],
      specs,
    };
  });

/** FormData -> plain object (repeated keys become arrays). */
export function formDataToObject(form: FormData) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string") continue;
    out[k] = k in out ? ([] as unknown[]).concat(out[k], v) : v;
  }
  return out;
}
