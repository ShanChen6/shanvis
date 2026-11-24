import { describe, expect, it } from "vitest";
import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";

import { demoProducts } from "@/lib/catalog/demo-data";

import { createRigAgent } from "./rig-agent";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

const toolCall = (id: string, toolName: string, input: unknown): LanguageModelV4GenerateResult => ({
  content: [{ type: "tool-call" as const, toolCallId: id, toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
});

const text = (t: string): LanguageModelV4GenerateResult => ({
  content: [{ type: "text" as const, text: t }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage,
  warnings: [],
});

describe("rig agent", () => {
  it("searches, gets a mount mismatch rejected, fixes it and ends with a valid kit", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCall("1", "searchCatalog", { category: "lens", maxPrice: 15_000_000 }),
        toolCall("2", "proposeRig", {
          title: "Wrong",
          rationale: "x",
          bodySlug: "sony-zv-e10-ii",
          lensSlug: "canon-rf-50mm-f1-8-stm",
          budgetVnd: 40_000_000,
        }),
        toolCall("3", "proposeRig", {
          title: "Vlog kit",
          rationale: "Nhỏ gọn, quay vlog tốt.",
          bodySlug: "sony-zv-e10-ii",
          lensSlug: "sigma-18-50mm-f2-8-dc-dn-e",
          budgetVnd: 40_000_000,
        }),
        text("Đây là combo phù hợp nhất cho bạn."),
      ],
    });

    let catalogLoads = 0;
    const agent = createRigAgent({
      model,
      loadCatalog: async () => {
        catalogLoads++;
        return demoProducts;
      },
    });

    const result = await agent.generate({ prompt: "Combo vlog dưới 40 triệu" });

    expect(result.text).toBe("Đây là combo phù hợp nhất cho bạn.");
    expect(catalogLoads).toBe(3);

    const outputs = result.steps.flatMap((s) => s.toolResults).map((r) => r.output as Record<string, unknown>);
    const search = outputs[0] as { products: { slug: string }[] };
    expect(search.products.map((p) => p.slug)).toContain("sigma-18-50mm-f2-8-dc-dn-e");

    const [rejected, accepted] = outputs.slice(1) as { valid: boolean; problemsForAssistant: string[]; totalVnd: number }[];
    expect(rejected.valid).toBe(false);
    expect(rejected.problemsForAssistant[0]).toContain("won't fit");
    expect(accepted.valid).toBe(true);
    expect(accepted.totalVnd).toBe(38_980_000);

    // The model saw the tool definitions and the shop instructions.
    const firstCall = model.doGenerateCalls[0];
    expect(firstCall.tools?.map((t) => t.name).sort()).toEqual(["proposeRig", "searchCatalog"]);
    expect(JSON.stringify(firstCall.prompt)).toContain("SHANVIS AI Rig Builder");
  });

  it("rejects tool input that violates the schema without running the tool", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [toolCall("1", "searchCatalog", { maxPrice: -5 }), text("ok")],
    });
    let loads = 0;
    const agent = createRigAgent({ model, loadCatalog: async () => (loads++, demoProducts) });
    await agent.generate({ prompt: "x" });
    expect(loads).toBe(0);
  });
});
