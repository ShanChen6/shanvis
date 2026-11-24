import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { CameraSpecs, ProductWithSpecs, SamplePhoto } from "@/types/catalog";

import { demoProducts, demoSamplePhotos } from "./demo-data";

export const CATALOG_TAG = "catalog";

/**
 * All active products with their specs. The catalog is small (hundreds of
 * SKUs), so it is fetched once, cached, and filtered in memory.
 * Falls back to the offline demo catalog when Supabase is not configured.
 */
export async function getCatalog(): Promise<ProductWithSpecs[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const supabase = createPublicClient();
  if (!supabase) return demoProducts;

  const { data, error } = await supabase
    .from("products")
    .select("*, camera_specs(specs)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load catalog: ${error.message}`);

  return data.map(({ camera_specs, ...product }) => ({
    ...product,
    specs: (camera_specs as { specs: CameraSpecs } | null)?.specs ?? null,
  })) as ProductWithSpecs[];
}

export async function getProductBySlug(slug: string) {
  const catalog = await getCatalog();
  return catalog.find((p) => p.slug === slug) ?? null;
}

export async function getSamplePhotos(productId: string): Promise<SamplePhoto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG, `sample-photos:${productId}`);

  const supabase = createPublicClient();
  if (!supabase) return demoSamplePhotos.filter((p) => p.product_id === productId);

  const { data, error } = await supabase
    .from("sample_photos")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");

  if (error) throw new Error(`Failed to load sample photos: ${error.message}`);
  return data as SamplePhoto[];
}
