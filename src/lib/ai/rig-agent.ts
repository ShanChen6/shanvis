import { isStepCount, ToolLoopAgent, tool, type InferAgentUIMessage, type LanguageModel } from "ai";
import { z } from "zod";

import { MOUNT_TYPES, PRODUCT_CATEGORIES, SENSOR_SIZES, type ProductWithSpecs } from "@/types/catalog";

import { describeProblems, proposeRig, searchCatalog } from "./rig";

const INSTRUCTIONS = `You are the SHANVIS AI Rig Builder, a camera-shop assistant in Vietnam.
Customers describe what they shoot and their budget; you put together camera kits from the SHANVIS catalog.

Rules:
- Reply in the customer's language (usually Vietnamese). Be concise and friendly; explain choices in plain words for beginners.
- Prices are in VND. "35 triệu" / "35tr" = 35,000,000 VND. Treat the budget as the total for the whole kit.
- Only recommend products returned by searchCatalog. Never invent products, prices or specs.
- A kit is one body plus one lens with the same mount, optionally accessories. Fixed-lens bodies (marked FIXED LENS) need no lens and cannot take one.
- Before recommending any kit you MUST call proposeRig with it. If proposeRig returns valid=false, fix the problems (search again if needed) and call it again. Only describe kits that came back valid.
- Offer 1 to 3 valid kits, best match first, each as its own proposeRig call. Explain briefly why each one fits (size/weight, low light, video, focal length).
- If nothing in stock fits the budget, say so honestly and propose the closest option, stating how far over budget it is.
- Do not repeat the full spec list or prices in text: the kit cards shown to the customer already include them.
- Stay on topic (cameras, lenses, accessories, photography). Politely decline anything else.`;

export function createRigAgent({
  model,
  loadCatalog,
}: {
  model: LanguageModel;
  loadCatalog: () => Promise<ProductWithSpecs[]>;
}) {
  return new ToolLoopAgent({
    model,
    instructions: INSTRUCTIONS,
    stopWhen: isStepCount(10),
    maxOutputTokens: 1500,
    tools: {
      searchCatalog: tool({
        description:
          "Search in-stock SHANVIS products. Returns slug, name, category, price (VND), stock, mount, sensor and a short spec summary, cheapest first.",
        inputSchema: z.object({
          category: z.enum(PRODUCT_CATEGORIES).optional(),
          mount: z.enum(MOUNT_TYPES).optional().describe("Only products for this lens mount."),
          sensor: z.enum(SENSOR_SIZES).optional().describe("Body sensor size or lens format coverage."),
          maxPrice: z.number().int().positive().optional().describe("Maximum price per item in VND."),
          maxAperture: z
            .number()
            .positive()
            .optional()
            .describe("Lenses only: e.g. 2.8 returns lenses with f/2.8 or brighter."),
          query: z.string().max(100).optional().describe("Keywords, e.g. 'vlog', 'compact', '35mm'."),
        }),
        execute: async (input) => ({ products: searchCatalog(await loadCatalog(), input) }),
      }),

      proposeRig: tool({
        description:
          "Validate a kit (body + lens + optional accessories) and show it to the customer as a card with an 'add all to cart' button. Checks that products exist, are in stock, share a mount and fit the budget.",
        inputSchema: z.object({
          title: z.string().max(60).describe("Short kit name, e.g. 'Street & vlog compact kit'."),
          rationale: z.string().max(400).describe("One or two sentences, in the customer's language, on why this kit fits."),
          bodySlug: z.string(),
          lensSlug: z.string().optional().describe("Omit only for fixed-lens bodies."),
          accessorySlugs: z.array(z.string()).max(3).optional(),
          budgetVnd: z.number().int().positive().optional().describe("Customer's total budget in VND, if they gave one."),
        }),
        execute: async (input) => {
          const rig = proposeRig(await loadCatalog(), input);
          return { ...rig, problemsForAssistant: describeProblems(rig.problems) };
        },
      }),
    },
  });
}

export type RigAgent = ReturnType<typeof createRigAgent>;
export type RigAgentUIMessage = InferAgentUIMessage<RigAgent>;
