import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MemoryStore } from "@/lib/store/memory";
import type { Order } from "@/lib/store/types";
import { demoProducts } from "@/lib/catalog/demo-data";

import { DemoPaymentProvider } from "./demo";
import { parseVietnamDateTime, transferNote } from "./types";

async function newOrder(store: MemoryStore): Promise<Order> {
  return store.placeOrder({
    customer: { name: "Tran B", phone: "0987654321", email: null },
    address: { line: "1 Le Loi", province: "HCM", district: "Q1", ward: "Ben Nghe", ghnDistrictId: null, ghnWardCode: null },
    note: null,
    items: [{ productId: demoProducts.find((p) => p.slug === "canon-rf-50mm-f1-8-stm")!.id, quantity: 1 }],
    shippingFee: 30_000,
    shippingProvider: "flat",
    insuranceValue: 0,
    paymentProvider: "demo",
    paymentExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
}

describe("payment helpers", () => {
  it("keeps the transfer note within PayOS's 9-character limit", () => {
    expect(transferNote(100001)).toBe("SV100001");
    expect(transferNote(1234567890).length).toBe(9);
  });

  it("parses PayOS Vietnam-time timestamps", () => {
    expect(parseVietnamDateTime("2023-02-04 18:25:00")).toBe("2023-02-04T11:25:00.000Z");
  });
});

describe("DemoPaymentProvider", () => {
  it("signs simulated webhooks that the PayOS SDK verifies", async () => {
    const provider = new DemoPaymentProvider();
    const order = await newOrder(new MemoryStore());
    const webhook = await provider.simulateTransfer(order);
    const verified = await provider.verifyWebhook(webhook);
    expect(verified).toMatchObject({ success: true, orderCode: order.orderCode, amount: order.total });
  });

  it("rejects tampered webhooks", async () => {
    const provider = new DemoPaymentProvider();
    const order = await newOrder(new MemoryStore());
    const webhook = await provider.simulateTransfer(order);
    await expect(provider.verifyWebhook({ ...webhook, data: { ...webhook.data, amount: 1 } })).rejects.toThrow();
    await expect(provider.verifyWebhook({ ...webhook, signature: "0".repeat(64) })).rejects.toThrow();
  });

  it("rejects webhooks signed with another key", async () => {
    const order = await newOrder(new MemoryStore());
    const forged = await new DemoPaymentProvider().simulateTransfer(order);
    await expect(new DemoPaymentProvider().verifyWebhook(forged)).rejects.toThrow();
  });
});
