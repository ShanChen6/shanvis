import type { CameraSpecs, ProductWithSpecs, SamplePhoto } from "@/types/catalog";

/**
 * Offline demo catalog, mirroring supabase/seed.sql. Used when Supabase is not
 * configured so the storefront can be developed and tested without a database.
 */

type DemoRow = Omit<ProductWithSpecs, "id" | "images" | "is_active" | "created_at" | "updated_at"> & {
  specs: CameraSpecs;
};

const rows: DemoRow[] = [
  {
    slug: "sony-a7-iv",
    name: "Sony Alpha a7 IV",
    brand: "sony",
    category: "body",
    price: 52990000,
    stock: 8,
    description: "33MP full-frame hybrid with 4K60 10-bit and 5.5-stop IBIS.",
    specs: { kind: "body", mount_type: "sony-e", sensor_size: "full-frame", megapixels: 33, iso_min: 100, iso_max: 51200, ibis_stops: 5.5, video_max: "4K60 10-bit", weight_g: 658 },
  },
  {
    slug: "sony-zv-e10-ii",
    name: "Sony ZV-E10 II",
    brand: "sony",
    category: "body",
    price: 24990000,
    stock: 12,
    description: "Compact APS-C vlogging body with 4K60 and a flip-out screen.",
    specs: { kind: "body", mount_type: "sony-e", sensor_size: "aps-c", megapixels: 26, iso_min: 100, iso_max: 32000, ibis_stops: null, video_max: "4K60 10-bit", weight_g: 377 },
  },
  {
    slug: "canon-eos-r6-mark-ii",
    name: "Canon EOS R6 Mark II",
    brand: "canon",
    category: "body",
    price: 56990000,
    stock: 5,
    description: "24MP full-frame with class-leading low-light AF and 8-stop IBIS.",
    specs: { kind: "body", mount_type: "canon-rf", sensor_size: "full-frame", megapixels: 24.2, iso_min: 100, iso_max: 102400, ibis_stops: 8, video_max: "4K60 10-bit", weight_g: 670 },
  },
  {
    slug: "fujifilm-x100vi",
    name: "Fujifilm X100VI",
    brand: "fujifilm",
    category: "body",
    price: 44990000,
    stock: 3,
    description: "Fixed 23mm f/2 street camera with 40MP X-Trans and film simulations.",
    specs: { kind: "body", mount_type: "fujifilm-x", sensor_size: "aps-c", megapixels: 40.2, iso_min: 125, iso_max: 12800, ibis_stops: 6, video_max: "6.2K30", weight_g: 521, fixed_lens: "23mm f/2" },
  },
  {
    slug: "fujifilm-x-t5",
    name: "Fujifilm X-T5",
    brand: "fujifilm",
    category: "body",
    price: 41990000,
    stock: 6,
    description: "40MP APS-C with classic dials and 7-stop IBIS.",
    specs: { kind: "body", mount_type: "fujifilm-x", sensor_size: "aps-c", megapixels: 40.2, iso_min: 125, iso_max: 12800, ibis_stops: 7, video_max: "6.2K30", weight_g: 557 },
  },
  {
    slug: "nikon-z6-iii",
    name: "Nikon Z6III",
    brand: "nikon",
    category: "body",
    price: 57990000,
    stock: 4,
    description: "Partially stacked 24MP full-frame with 6K RAW video.",
    specs: { kind: "body", mount_type: "nikon-z", sensor_size: "full-frame", megapixels: 24.5, iso_min: 100, iso_max: 64000, ibis_stops: 8, video_max: "6K60 RAW", weight_g: 760 },
  },
  {
    slug: "sony-fe-35mm-f1-8",
    name: "Sony FE 35mm f/1.8",
    brand: "sony",
    category: "lens",
    price: 12490000,
    stock: 10,
    description: "Light everyday full-frame prime.",
    specs: { kind: "lens", mount_type: "sony-e", sensor_coverage: "full-frame", focal_min_mm: 35, focal_max_mm: 35, aperture_max: 1.8, aperture_min: 22, ois: false, weight_g: 280 },
  },
  {
    slug: "sony-fe-24-70mm-f2-8-gm-ii",
    name: "Sony FE 24-70mm f/2.8 GM II",
    brand: "sony",
    category: "lens",
    price: 52990000,
    stock: 2,
    description: "Flagship standard zoom, 695 g.",
    specs: { kind: "lens", mount_type: "sony-e", sensor_coverage: "full-frame", focal_min_mm: 24, focal_max_mm: 70, aperture_max: 2.8, aperture_min: 22, ois: false, weight_g: 695 },
  },
  {
    slug: "sigma-18-50mm-f2-8-dc-dn-e",
    name: "Sigma 18-50mm f/2.8 DC DN (E)",
    brand: "sigma",
    category: "lens",
    price: 13990000,
    stock: 9,
    description: "Tiny constant f/2.8 APS-C zoom, ideal for vlogging.",
    specs: { kind: "lens", mount_type: "sony-e", sensor_coverage: "aps-c", focal_min_mm: 18, focal_max_mm: 50, aperture_max: 2.8, aperture_min: 22, ois: false, weight_g: 290 },
  },
  {
    slug: "canon-rf-50mm-f1-8-stm",
    name: "Canon RF 50mm f/1.8 STM",
    brand: "canon",
    category: "lens",
    price: 5490000,
    stock: 15,
    description: "The nifty fifty for RF.",
    specs: { kind: "lens", mount_type: "canon-rf", sensor_coverage: "full-frame", focal_min_mm: 50, focal_max_mm: 50, aperture_max: 1.8, aperture_min: 22, ois: false, weight_g: 160 },
  },
  {
    slug: "fujifilm-xf-23mm-f1-4-r-lm-wr",
    name: "Fujifilm XF 23mm f/1.4 R LM WR",
    brand: "fujifilm",
    category: "lens",
    price: 22990000,
    stock: 4,
    description: "Fast weather-sealed 35mm-equivalent prime.",
    specs: { kind: "lens", mount_type: "fujifilm-x", sensor_coverage: "aps-c", focal_min_mm: 23, focal_max_mm: 23, aperture_max: 1.4, aperture_min: 16, ois: false, weight_g: 375 },
  },
  {
    slug: "nikon-z-24-120mm-f4-s",
    name: "Nikon Z 24-120mm f/4 S",
    brand: "nikon",
    category: "lens",
    price: 27990000,
    stock: 3,
    description: "Versatile S-line travel zoom.",
    specs: { kind: "lens", mount_type: "nikon-z", sensor_coverage: "full-frame", focal_min_mm: 24, focal_max_mm: 120, aperture_max: 4, aperture_min: 22, ois: false, weight_g: 630 },
  },
  {
    slug: "peak-design-slide-lite",
    name: "Peak Design Slide Lite",
    brand: "peak-design",
    category: "accessory",
    price: 1990000,
    stock: 20,
    description: "Quick-connect camera sling strap.",
    specs: { kind: "accessory", compatible_mounts: [], type: "strap" },
  },
  {
    slug: "sony-np-fz100",
    name: "Sony NP-FZ100 Battery",
    brand: "sony",
    category: "accessory",
    price: 2190000,
    stock: 25,
    description: "Z-series battery for Sony Alpha bodies.",
    specs: { kind: "accessory", compatible_mounts: ["sony-e"], type: "battery", capacity_mah: 2280 },
  },
];

const DEMO_TIMESTAMP = "2026-11-24T00:00:00.000Z";

export const demoProducts: ProductWithSpecs[] = rows.map((row, i) => ({
  ...row,
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  images: [],
  is_active: true,
  created_at: DEMO_TIMESTAMP,
  updated_at: DEMO_TIMESTAMP,
}));

const bySlug = (slug: string) => demoProducts.find((p) => p.slug === slug)!.id;

export const demoSamplePhotos: SamplePhoto[] = [
  { slug: "sony-a7-iv", alt: "Night market street portrait", exif: { camera: "Sony a7 IV", lens: "FE 35mm f/1.8", focal_length_mm: 35, aperture: 1.8, shutter: "1/125", iso: 3200 } },
  { slug: "sony-a7-iv", alt: "Ha Long Bay at sunrise", exif: { camera: "Sony a7 IV", lens: "FE 24-70mm f/2.8 GM II", focal_length_mm: 24, aperture: 8, shutter: "1/60", iso: 100 } },
  { slug: "sony-a7-iv", alt: "Cafe interior detail", exif: { camera: "Sony a7 IV", lens: "FE 24-70mm f/2.8 GM II", focal_length_mm: 70, aperture: 2.8, shutter: "1/200", iso: 800 } },
  { slug: "fujifilm-x100vi", alt: "Hoi An lantern alley", exif: { camera: "Fujifilm X100VI", lens: "23mm f/2", focal_length_mm: 23, aperture: 2, shutter: "1/250", iso: 400 } },
  { slug: "fujifilm-x100vi", alt: "Motorbikes in the rain", exif: { camera: "Fujifilm X100VI", lens: "23mm f/2", focal_length_mm: 23, aperture: 5.6, shutter: "1/500", iso: 1600 } },
  { slug: "fujifilm-xf-23mm-f1-4-r-lm-wr", alt: "Window-light portrait", exif: { camera: "Fujifilm X-T5", lens: "XF 23mm f/1.4 R LM WR", focal_length_mm: 23, aperture: 1.4, shutter: "1/320", iso: 250 } },
  { slug: "canon-eos-r6-mark-ii", alt: "Concert stage at ISO 12800", exif: { camera: "Canon EOS R6 Mark II", lens: "RF 50mm f/1.8 STM", focal_length_mm: 50, aperture: 1.8, shutter: "1/500", iso: 12800 } },
].map((p, i) => ({
  id: `00000000-0000-4000-9000-${String(i + 1).padStart(12, "0")}`,
  product_id: bySlug(p.slug),
  image_url: null,
  alt: p.alt,
  exif: p.exif,
  sort_order: i,
}));
