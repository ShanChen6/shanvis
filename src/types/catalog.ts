/**
 * Domain types for the SHANVIS catalog.
 * Mirrors the Supabase schema in supabase/migrations.
 */

/** Brands featured in navigation and filters. Stored as a slug, so other brands are allowed. */
export const BRANDS = ["sony", "canon", "fujifilm", "nikon", "panasonic", "leica", "sigma", "tamron"] as const;
export type Brand = (typeof BRANDS)[number];

export const PRODUCT_CATEGORIES = ["body", "lens", "accessory"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const MOUNT_TYPES = ["sony-e", "canon-rf", "fujifilm-x", "fujifilm-g", "nikon-z", "l-mount"] as const;
export type MountType = (typeof MOUNT_TYPES)[number];

export const SENSOR_SIZES = ["full-frame", "aps-c", "medium-format", "micro-four-thirds"] as const;
export type SensorSize = (typeof SENSOR_SIZES)[number];

export const MOUNT_LABELS: Record<MountType, string> = {
  "sony-e": "Sony E-mount",
  "canon-rf": "Canon RF",
  "fujifilm-x": "Fujifilm X-mount",
  "fujifilm-g": "Fujifilm G-mount",
  "nikon-z": "Nikon Z-mount",
  "l-mount": "L-Mount",
};

export const SENSOR_LABELS: Record<SensorSize, string> = {
  "full-frame": "Full-frame",
  "aps-c": "APS-C",
  "medium-format": "Medium Format",
  "micro-four-thirds": "Micro Four Thirds",
};

export interface BodySpecs {
  kind: "body";
  mount_type: MountType;
  sensor_size: SensorSize;
  megapixels: number;
  iso_min: number;
  iso_max: number;
  /** Stops of in-body stabilisation; null when the body has no IBIS. */
  ibis_stops: number | null;
  video_max: string;
  /** Set for fixed-lens cameras (e.g. X100VI), which accept no interchangeable lenses. */
  fixed_lens?: string;
  weight_g: number;
}

export interface LensSpecs {
  kind: "lens";
  mount_type: MountType;
  /** Largest sensor format the lens covers. */
  sensor_coverage: SensorSize;
  focal_min_mm: number;
  focal_max_mm: number;
  aperture_max: number;
  aperture_min: number;
  ois: boolean;
  weight_g: number;
}

export interface AccessorySpecs {
  kind: "accessory";
  /** Mounts this accessory is compatible with; empty means universal. */
  compatible_mounts: MountType[];
  [key: string]: unknown;
}

export type CameraSpecs = BodySpecs | LensSpecs | AccessorySpecs;

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: Brand | (string & {});
  category: ProductCategory;
  /** Price in VND (integer). */
  price: number;
  stock: number;
  description: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithSpecs extends Product {
  specs: CameraSpecs | null;
}

export interface Exif {
  camera: string;
  lens: string;
  focal_length_mm: number;
  aperture: number;
  /** Shutter speed as shown on camera, e.g. "1/250" or "2" (seconds). */
  shutter: string;
  iso: number;
}

export interface SamplePhoto {
  id: string;
  product_id: string;
  /** null only in offline demo data, where a placeholder frame is rendered. */
  image_url: string | null;
  alt: string;
  exif: Exif;
  sort_order: number;
}
