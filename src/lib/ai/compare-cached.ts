import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { CATALOG_TAG, getCatalog } from "@/lib/catalog/source";

import { compareWithModel, type Comparison } from "./compare";
import { getLanguageModel } from "./model";

/**
 * AI comparison for a pair of products, cached for days per pair (in
 * canonical slug order) so repeat visits don't call the model again.
 * Throws on model errors so failures are not cached.
 */
export async function getAiComparison(slugA: string, slugB: string): Promise<{ comparison: Comparison; swapped: boolean } | null> {
  const swapped = slugA > slugB;
  const result = await cachedComparison(swapped ? slugB : slugA, swapped ? slugA : slugB);
  return result && { comparison: result, swapped };
}

async function cachedComparison(first: string, second: string): Promise<Comparison | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CATALOG_TAG, `compare:${first}:${second}`);

  const model = getLanguageModel();
  if (!model) return null;
  const catalog = await getCatalog();
  const a = catalog.find((p) => p.slug === first);
  const b = catalog.find((p) => p.slug === second);
  if (!a || !b) return null;
  return compareWithModel(model, a, b);
}
