import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { CameraSpecs, ProductWithSpecs, SamplePhoto } from "@/types/catalog";

import { getStore } from "@/lib/store";

import { demoSamplePhotos } from "./demo-data";

export const CATALOG_TAG = "catalog";

/**
 * All active products with their specs. The catalog is small (hundreds of
 * SKUs), so it is fetched once, cached, and filtered in memory.
 * Falls back to the offline demo catalog when Supabase is not configured.
 */
export async function getCatalog(): Promise<ProductWithSpecs[]> {
  "use cache";
  // Stock changes often; orders always re-check stock in the database, so this
  // only bounds how stale the displayed stock can be.
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const supabase = createPublicClient();
  if (!supabase) {
    // Demo mode: the in-memory store holds the demo catalog and its live stock.
    return (await getStore().listAllProducts()).filter((p) => p.is_active);
  }

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
  return catalog.find((p) => p.slug === slug) ?? (await lookupProductBySlug(slug));
}

/**
 * Fallback for slugs missing from the cached catalog, e.g. a product created
 * moments ago while the catalog entry is still being revalidated. Keyed per
 * slug with a very short life, so a brand-new slug is always looked up fresh.
 */
async function lookupProductBySlug(slug: string): Promise<ProductWithSpecs | null> {
  "use cache";
  cacheLife("seconds");
  cacheTag(CATALOG_TAG);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const supabase = createPublicClient();
  if (!supabase) {
    return (await getStore().listAllProducts()).find((p) => p.slug === slug && p.is_active) ?? null;
  }
  const { data, error } = await supabase
    .from("products")
    .select("*, camera_specs(specs)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;
  const { camera_specs, ...product } = data;
  return { ...product, specs: (camera_specs as { specs: CameraSpecs } | null)?.specs ?? null } as ProductWithSpecs;
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
