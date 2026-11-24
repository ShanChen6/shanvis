import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { ProductWithSpecs } from "@/types/catalog";

import { GhnClient, type GhnConfig } from "./ghn";
import { buildParcel, declaredValue, type ParcelLine } from "./parcel";

export interface ShippingAddressIds {
  ghnDistrictId: number | null;
  ghnWardCode: string | null;
}

export interface ShippingQuote {
  provider: "ghn" | "flat";
  fee: number;
  insuranceValue: number;
  /** True when the order is worth more than the carrier will insure. */
  insuranceCapped: boolean;
  insuranceCap: number;
  weightG: number;
}

export class ShippingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShippingError";
  }
}

function intEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function ghnConfig(): GhnConfig | null {
  const token = process.env.GHN_TOKEN;
  const shopId = Number(process.env.GHN_SHOP_ID);
  if (!token || !Number.isFinite(shopId) || shopId <= 0) return null;
  return {
    token,
    shopId,
    env: process.env.GHN_ENV === "production" ? "production" : "dev",
    fromDistrictId: process.env.GHN_FROM_DISTRICT_ID ? Number(process.env.GHN_FROM_DISTRICT_ID) : undefined,
    fromWardCode: process.env.GHN_FROM_WARD_CODE || undefined,
  };
}

export function shippingMode(): "ghn" | "flat" {
  return ghnConfig() ? "ghn" : "flat";
}

/**
 * Quote shipping for order lines. Uses GHN when configured (requires GHN
 * district/ward ids), otherwise a flat fee (SHIPPING_FLAT_FEE, default 50,000).
 */
export async function quoteShipping(lines: ParcelLine[], address: ShippingAddressIds): Promise<ShippingQuote> {
  const subtotal = lines.reduce((n, l) => n + l.product.price * l.quantity, 0);
  const cap = intEnv("SHIPPING_MAX_INSURANCE_VALUE", 5_000_000);
  const insurance = declaredValue(subtotal, cap);
  const parcel = buildParcel(lines);
  const base = { insuranceValue: insurance.value, insuranceCapped: insurance.capped, insuranceCap: cap, weightG: parcel.weightG };

  const config = ghnConfig();
  if (!config) {
    return { provider: "flat", fee: intEnv("SHIPPING_FLAT_FEE", 50_000), ...base };
  }
  if (!address.ghnDistrictId || !address.ghnWardCode) {
    throw new ShippingError("Choose your province, district and ward to calculate shipping.");
  }
  try {
    const fee = await new GhnClient(config).fee({
      toDistrictId: address.ghnDistrictId,
      toWardCode: address.ghnWardCode,
      weightG: parcel.weightG,
      lengthCm: parcel.lengthCm,
      widthCm: parcel.widthCm,
      heightCm: parcel.heightCm,
      insuranceValue: insurance.value,
    });
    return { provider: "ghn", fee: fee.total, ...base };
  } catch (error) {
    console.error("GHN fee failed", error);
    throw new ShippingError("We couldn't get a shipping quote from GHN right now. Please try again.");
  }
}

export function linesFromCatalog(catalog: ProductWithSpecs[], items: { productId: string; quantity: number }[]) {
  return items.map(({ productId, quantity }) => {
    const product = catalog.find((p) => p.id === productId);
    if (!product) throw new ShippingError("A product in your cart is no longer available.");
    return { product, quantity };
  });
}

/* ----------------------------- address lists ----------------------------- */

export async function ghnProvinces() {
  "use cache";
  cacheLife("days");
  cacheTag("ghn-master-data");
  const config = ghnConfig();
  return config ? new GhnClient(config).provinces() : [];
}

export async function ghnDistricts(provinceId: number) {
  "use cache";
  cacheLife("days");
  cacheTag("ghn-master-data");
  const config = ghnConfig();
  return config ? new GhnClient(config).districts(provinceId) : [];
}

export async function ghnWards(districtId: number) {
  "use cache";
  cacheLife("days");
  cacheTag("ghn-master-data");
  const config = ghnConfig();
  return config ? new GhnClient(config).wards(districtId) : [];
}
