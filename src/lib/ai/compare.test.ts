import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { demoProducts } from "@/lib/catalog/demo-data";

import { compareWithModel, comparisonPrompt, type Comparison } from "./compare";

const a7iv = demoProducts.find((p) => p.slug === "sony-a7-iv")!;
const r6 = demoProducts.find((p) => p.slug === "canon-eos-r6-mark-ii")!;

const sample: Comparison = {
  headline: "Both are great; the R6 II is better in the dark, the a7 IV has more resolution.",
  a: { strengths: ["33MP for cropping"], tradeoffs: ["Less stabilisation"] },
  b: { strengths: ["8-stop IBIS"], tradeoffs: ["Pricier"] },
  picks: [
    { scenario: "Landscapes", choice: "a", reason: "More pixels." },
    { scenario: "Weddings", choice: "b", reason: "Better low light." },
  ],
  beginnerTip: "Spend on a good lens first.",
};

const reply = (json: unknown): LanguageModelV4GenerateResult => ({
  content: [{ type: "text", text: JSON.stringify(json) }],
  finishReason: { unified: "stop", raw: undefined },
  usage: {
    inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  },
  warnings: [],
});

describe("comparisonPrompt", () => {
  it("embeds both products' specs from the catalog", () => {
    const prompt = comparisonPrompt(a7iv, r6);
    expect(prompt).toContain('"megapixels":33');
    expect(prompt).toContain('"ibis_stops":8');
    expect(prompt).toContain("Canon EOS R6 Mark II");
  });
});

describe("compareWithModel", () => {
  it("returns the parsed, schema-validated comparison", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply(sample)] });
    await expect(compareWithModel(model, a7iv, r6)).resolves.toEqual(sample);
    expect(model.doGenerateCalls[0].responseFormat?.type).toBe("json");
  });

  it("rejects output that does not match the schema", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply({ headline: "only this" })] });
    await expect(compareWithModel(model, a7iv, r6)).rejects.toThrow();
  });
});

describe("swapComparison", () => {
  it("swaps sides and flips picks", async () => {
    const { swapComparison } = await import("./swap");
    const s = swapComparison(sample);
    expect(s.a).toEqual(sample.b);
    expect(s.picks.map((p) => p.choice)).toEqual(["b", "a"]);
    expect(swapComparison(s)).toEqual(sample);
  });
});
