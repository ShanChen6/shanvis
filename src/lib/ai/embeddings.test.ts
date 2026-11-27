import { MockEmbeddingModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { demoProducts } from "@/lib/catalog/demo-data";

import { EMBEDDING_DIMENSIONS, embedProduct, embeddingText } from "./embeddings";

const a7iv = demoProducts.find((p) => p.slug === "sony-a7-iv")!;
const sigma = demoProducts.find((p) => p.slug === "sigma-18-50mm-f2-8-dc-dn-e")!;

describe("embeddingText", () => {
  it("describes bodies and lenses in shopper terms", () => {
    expect(embeddingText(a7iv)).toContain("Full-frame camera, Sony E-mount, 33 megapixels");
    expect(embeddingText(a7iv)).toContain("5.5-stop in-body stabilisation");
    expect(embeddingText(sigma)).toContain("18-50mm f/2.8 zoom lens for Sony E-mount");
    expect(embeddingText(sigma)).toContain("vlogging");
  });
});

describe("embedProduct", () => {
  it("requests 768-dim document embeddings", async () => {
    const model = new MockEmbeddingModelV4({
      doEmbed: async () => ({ embeddings: [Array(EMBEDDING_DIMENSIONS).fill(0.1)], warnings: [] }),
    });
    const result = await embedProduct(model, a7iv);
    expect(result.embedding).toHaveLength(768);
    expect(model.doEmbedCalls[0].providerOptions).toEqual({
      google: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" },
    });
    expect(model.doEmbedCalls[0].values).toEqual([embeddingText(a7iv)]);
  });

  it("rejects embeddings of the wrong size", async () => {
    const model = new MockEmbeddingModelV4({ doEmbed: async () => ({ embeddings: [[1, 2, 3]], warnings: [] }) });
    await expect(embedProduct(model, a7iv)).rejects.toThrow(/768/);
  });
});
