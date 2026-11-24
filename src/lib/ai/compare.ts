import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";

import type { ProductWithSpecs } from "@/types/catalog";

const side = z.object({
  strengths: z.array(z.string().max(160)).min(1).max(4),
  tradeoffs: z.array(z.string().max(160)).min(1).max(3),
});

export const comparisonSchema = z.object({
  headline: z.string().max(220).describe("One-sentence verdict for a beginner."),
  a: side.describe("Product A"),
  b: side.describe("Product B"),
  picks: z
    .array(
      z.object({
        scenario: z.string().max(60).describe("A shooting situation, e.g. 'Travel', 'Low-light events'."),
        choice: z.enum(["a", "b", "either"]),
        reason: z.string().max(160),
      }),
    )
    .min(2)
    .max(5),
  beginnerTip: z.string().max(240).describe("One practical tip for someone new to photography."),
});

export type Comparison = z.infer<typeof comparisonSchema>;

function describe(p: ProductWithSpecs) {
  return JSON.stringify({ name: p.name, brand: p.brand, priceVnd: p.price, specs: p.specs });
}

export function comparisonPrompt(a: ProductWithSpecs, b: ProductWithSpecs) {
  return `Compare these two products for a beginner photographer shopping in Vietnam.

Product A: ${describe(a)}
Product B: ${describe(b)}

Rules:
- Use only the specs given above; do not invent features or numbers that are not listed.
- Explain jargon in plain words (e.g. what IBIS or a wider aperture means for their photos).
- Mention price/value where relevant. Prices are in VND.
- Write in English, short and concrete.`;
}

export async function compareWithModel(model: LanguageModel, a: ProductWithSpecs, b: ProductWithSpecs) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: comparisonSchema }),
    system: "You are a friendly, honest camera expert at the SHANVIS camera store.",
    prompt: comparisonPrompt(a, b),
    maxOutputTokens: 1200,
  });
  return output;
}
