import type { BodySpecs, LensSpecs } from "@/types/catalog";

/**
 * Static showcase content for the home page until the storefront reads from
 * Supabase (week 2). Values match supabase/seed.sql.
 */
export const featuredBody = {
  slug: "sony-a7-iv",
  name: "Sony Alpha a7 IV",
  price: 52990000,
  specs: {
    kind: "body",
    mount_type: "sony-e",
    sensor_size: "full-frame",
    megapixels: 33,
    iso_min: 100,
    iso_max: 51200,
    ibis_stops: 5.5,
    video_max: "4K60 10-bit",
    weight_g: 658,
  } satisfies BodySpecs,
};

export const featuredLens = {
  slug: "fujifilm-xf-23mm-f1-4-r-lm-wr",
  name: "Fujifilm XF 23mm f/1.4 R LM WR",
  price: 22990000,
  specs: {
    kind: "lens",
    mount_type: "fujifilm-x",
    sensor_coverage: "aps-c",
    focal_min_mm: 23,
    focal_max_mm: 23,
    aperture_max: 1.4,
    aperture_min: 16,
    ois: false,
    weight_g: 375,
  } satisfies LensSpecs,
};

export const sampleExif = {
  camera: "X-T5",
  lens: "XF 23mm",
  focal: "23mm",
  aperture: "f/2.0",
  shutter: "1/250s",
  iso: "ISO 400",
};
