import type { ProductWithSpecs } from "@/types/catalog";

export interface ParcelLine {
  product: ProductWithSpecs;
  quantity: number;
}

export interface Parcel {
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

/** Packaging allowance: box + padding per order, plus bubble wrap per item. */
const BOX_G = 400;
const PER_ITEM_PADDING_G = 150;
const DEFAULT_WEIGHT_G = { body: 700, lens: 500, accessory: 300 } as const;

function itemWeight(p: ProductWithSpecs) {
  const w = p.specs && "weight_g" in p.specs && typeof p.specs.weight_g === "number" ? p.specs.weight_g : null;
  return w ?? DEFAULT_WEIGHT_G[p.category];
}

/** Estimate the shipping parcel for a set of order lines. */
export function buildParcel(lines: ParcelLine[]): Parcel {
  const weightG = lines.reduce((g, l) => g + (itemWeight(l.product) + PER_ITEM_PADDING_G) * l.quantity, BOX_G);
  const box = weightG <= 1500 ? [30, 22, 15] : weightG <= 4000 ? [40, 30, 25] : [50, 40, 35];
  return { weightG, lengthCm: box[0], widthCm: box[1], heightCm: box[2] };
}

/**
 * Declared value for carrier insurance, capped at the carrier's maximum
 * (GHN: 5,000,000 VND by default; override with SHIPPING_MAX_INSURANCE_VALUE).
 */
export function declaredValue(subtotal: number, cap: number) {
  const value = Math.min(subtotal, cap);
  return { value, capped: subtotal > cap };
}
