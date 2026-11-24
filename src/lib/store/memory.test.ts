import { beforeEach, describe, expect, it } from "vitest";

import { demoProducts } from "@/lib/catalog/demo-data";

import { MemoryStore } from "./memory";
import { StoreError, type PlaceOrderInput } from "./types";

const id = (slug: string) => demoProducts.find((p) => p.slug === slug)!.id;
const later = () => new Date(Date.now() + 15 * 60_000).toISOString();
const earlier = () => new Date(Date.now() - 60_000).toISOString();

const input = (items: [string, number][], expiresAt = later()): PlaceOrderInput => ({
  customer: { name: "Nguyen Van A", phone: "0912345678", email: null },
  address: { line: "12 Hang Bai", province: "Ha Noi", district: "Hoan Kiem", ward: "Hang Bai", ghnDistrictId: null, ghnWardCode: null },
  note: null,
  items: items.map(([slug, quantity]) => ({ productId: id(slug), quantity })),
  shippingFee: 50_000,
  shippingProvider: "flat",
  insuranceValue: 5_000_000,
  paymentProvider: "demo",
  paymentExpiresAt: expiresAt,
});

const stockOf = async (store: MemoryStore, slug: string) =>
  (await store.listAllProducts()).find((p) => p.slug === slug)!.stock;

const pay = (store: MemoryStore, orderCode: number, reference: string, amount: number) =>
  store.recordPayment({ orderCode, provider: "payos", reference, amount, paidAt: new Date().toISOString() });

describe("MemoryStore orders (mirrors the SQL functions)", () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
  });

  it("prices lines from the catalog and reserves stock", async () => {
    const o = await store.placeOrder(input([["sony-a7-iv", 2], ["sony-fe-35mm-f1-8", 1]]));
    expect(o.subtotal).toBe(2 * 52_990_000 + 12_490_000);
    expect(o.total).toBe(o.subtotal + 50_000);
    expect(o.status).toBe("pending_payment");
    expect(o.publicId).toMatch(/^[0-9a-f]{32}$/);
    expect(await stockOf(store, "sony-a7-iv")).toBe(6);
  });

  it("rejects the whole order when any line lacks stock", async () => {
    await expect(store.placeOrder(input([["sony-fe-35mm-f1-8", 1], ["sony-fe-24-70mm-f2-8-gm-ii", 5]]))).rejects.toMatchObject({
      code: "insufficient_stock",
    });
    expect(await stockOf(store, "sony-fe-35mm-f1-8")).toBe(10);
    expect(await store.listOrders()).toHaveLength(0);
  });

  it("adds up partial transfers, ignores replays and refuses to cancel once money arrived", async () => {
    const o = await store.placeOrder(input([["canon-rf-50mm-f1-8-stm", 1]]));
    const first = await pay(store, o.orderCode, "REF1", 1_000_000);
    expect(first).toMatchObject({ status: "pending_payment", needsAttention: expect.stringContaining("Underpaid") });
    expect((await pay(store, o.orderCode, "REF1", 1_000_000))!.payment.amountPaid).toBe(1_000_000);
    await expect(store.cancelOrder(o.id)).rejects.toMatchObject({ code: "has_payments" });
    const done = await pay(store, o.orderCode, "REF2", o.total - 1_000_000);
    expect(done).toMatchObject({ status: "paid", needsAttention: null });
    expect(done!.payment.amountPaid).toBe(o.total);
  });

  it("flags extra money on a paid order", async () => {
    const o = await store.placeOrder(input([["canon-rf-50mm-f1-8-stm", 1]]));
    await pay(store, o.orderCode, "A", o.total);
    expect((await pay(store, o.orderCode, "B", 5000))!.needsAttention).toMatch(/5000 VND more/);
  });

  it("ignores unknown order codes (PayOS test webhook)", async () => {
    expect(await pay(store, 123, "TEST", 3000)).toBeNull();
  });

  it("expiry releases stock; a late full payment re-reserves it", async () => {
    const o = await store.placeOrder(input([["canon-rf-50mm-f1-8-stm", 3]], earlier()));
    expect(await store.expireStaleOrders()).toBe(1);
    expect(await stockOf(store, "canon-rf-50mm-f1-8-stm")).toBe(15);
    expect(await pay(store, o.orderCode, "LATE", o.total)).toMatchObject({ status: "paid", needsAttention: null });
    expect(await stockOf(store, "canon-rf-50mm-f1-8-stm")).toBe(12);
  });

  it("flags a late payment when the stock is gone and never goes negative", async () => {
    const o = await store.placeOrder(input([["fujifilm-x100vi", 3]], earlier()));
    await store.expireStaleOrders();
    await store.updateProduct(id("fujifilm-x100vi"), { stock: 0 });
    const paid = await pay(store, o.orderCode, "LATE2", o.total);
    expect(paid).toMatchObject({ status: "paid", needsAttention: expect.stringContaining("refund or restock") });
    expect(await stockOf(store, "fujifilm-x100vi")).toBe(0);
  });

  it("cancel releases stock; only pending orders can be cancelled; only paid ones shipped", async () => {
    const o = await store.placeOrder(input([["nikon-z6-iii", 1]]));
    await expect(store.markShipped(o.id, "GHN123")).rejects.toBeInstanceOf(StoreError);
    expect((await store.cancelOrder(o.id)).status).toBe("cancelled");
    expect(await stockOf(store, "nikon-z6-iii")).toBe(4);
    await expect(store.cancelOrder(o.id)).rejects.toMatchObject({ code: "cannot_cancel" });

    const p = await store.placeOrder(input([["nikon-z6-iii", 1]]));
    await pay(store, p.orderCode, "R", p.total);
    expect(await store.markShipped(p.id, "GHN123")).toMatchObject({ status: "shipped", trackingCode: "GHN123" });
  });

  it("rejects inactive products and returns copies, not live references", async () => {
    await store.updateProduct(id("sony-a7-iv"), { isActive: false });
    await expect(store.placeOrder(input([["sony-a7-iv", 1]]))).rejects.toMatchObject({ code: "product_unavailable" });
    const list = await store.listAllProducts();
    list[0].stock = 999;
    expect((await store.listAllProducts())[0].stock).not.toBe(999);
  });
});

describe("MemoryStore products", () => {
  it("creates products and rejects duplicates or mismatched specs", async () => {
    const store = new MemoryStore();
    const specs = { kind: "accessory" as const, compatible_mounts: [] };
    const created = await store.createProduct({
      slug: "test-strap", name: "Test strap", brand: "shanvis", category: "accessory",
      price: 100_000, stock: 5, description: null, images: [], specs,
    });
    expect(created.id).toBeTruthy();
    await expect(store.createProduct({ ...created, specs })).rejects.toMatchObject({ code: "duplicate_slug" });
    await expect(
      store.createProduct({ ...created, slug: "other", category: "lens", specs }),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("isStoreError", () => {
  it("recognises store errors without relying on instanceof", async () => {
    const { isStoreError } = await import("./types");
    const foreign = Object.assign(new Error("insufficient_stock"), { name: "StoreError", code: "insufficient_stock" });
    expect(isStoreError(foreign)).toBe(true);
    expect(isStoreError(new Error("x"))).toBe(false);
  });
});
