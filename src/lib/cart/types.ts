import type { Brand, MountType, ProductCategory, ProductWithSpecs, SensorSize } from "@/types/catalog";

/** Snapshot of a product as stored in the cart (persisted in localStorage). */
export interface CartProduct {
  productId: string;
  slug: string;
  name: string;
  brand: Brand | (string & {});
  category: ProductCategory;
  price: number;
  stock: number;
  /** Body or lens mount. */
  mount: MountType | null;
  /** Body sensor size, or the largest format a lens covers. */
  sensor: SensorSize | null;
  /** Fixed-lens bodies (e.g. X100VI) can't take interchangeable lenses. */
  fixedLens: string | null;
  /** Accessories only; empty means universal. */
  compatibleMounts: MountType[];
}

export interface CartItem extends CartProduct {
  quantity: number;
}

export function toCartProduct(p: ProductWithSpecs): CartProduct {
  const s = p.specs;
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    stock: p.stock,
    mount: s && s.kind !== "accessory" ? s.mount_type : null,
    sensor: s?.kind === "body" ? s.sensor_size : s?.kind === "lens" ? s.sensor_coverage : null,
    fixedLens: s?.kind === "body" ? (s.fixed_lens ?? null) : null,
    compatibleMounts: s?.kind === "accessory" ? s.compatible_mounts : [],
  };
}
