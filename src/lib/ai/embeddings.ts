import { embed, type EmbeddingModel } from "ai";

import { brandLabel } from "@/lib/catalog/filters";
import { formatAperture, formatFocalLength } from "@/lib/specs";
import { MOUNT_LABELS, SENSOR_LABELS, type ProductWithSpecs } from "@/types/catalog";

/** Must match product_embeddings.embedding (vector(768)). */
export const EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

/** The text we embed for a product: what a shopper would search by. */
export function embeddingText(p: ProductWithSpecs): string {
  const lines = [`${p.name} by ${brandLabel(p.brand)}`, `Category: ${p.category}`];
  const s = p.specs;
  if (s?.kind === "body") {
    lines.push(
      `${SENSOR_LABELS[s.sensor_size]} camera, ${MOUNT_LABELS[s.mount_type]}, ${s.megapixels} megapixels`,
      `ISO ${s.iso_min}-${s.iso_max}, ${s.ibis_stops ? `${s.ibis_stops}-stop in-body stabilisation` : "no in-body stabilisation"}`,
      `Video ${s.video_max}, weight ${s.weight_g} g${s.fixed_lens ? `, fixed ${s.fixed_lens} lens` : ""}`,
    );
  } else if (s?.kind === "lens") {
    lines.push(
      `${formatFocalLength(s)} ${formatAperture(s.aperture_max)} ${s.focal_min_mm === s.focal_max_mm ? "prime" : "zoom"} lens for ${MOUNT_LABELS[s.mount_type]}`,
      `Covers ${SENSOR_LABELS[s.sensor_coverage]}, ${s.ois ? "optically stabilised" : "no optical stabilisation"}, weight ${s.weight_g} g`,
    );
  } else if (s?.kind === "accessory") {
    lines.push(s.compatible_mounts.length ? `For ${s.compatible_mounts.map((m) => MOUNT_LABELS[m]).join(", ")}` : "Universal accessory");
  }
  if (p.description) lines.push(p.description);
  return lines.join("\n");
}

export async function embedProduct(model: EmbeddingModel, p: ProductWithSpecs) {
  const content = embeddingText(p);
  const { embedding } = await embed({
    model,
    value: content,
    providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "RETRIEVAL_DOCUMENT" } },
  });
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`);
  }
  return { content, embedding };
}
