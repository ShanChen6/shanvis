/**
 * End-to-end order flow against the in-memory store: checkout server action
 * -> payment link -> webhook / demo transfer -> order status endpoint.
 * Exercises the same code paths the browser hits, without a database.
 */
import { PayOS, type Webhook } from "@payos/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
  updateTag: () => {},
  revalidateTag: () => {},
}));

// Each call gets its own client IP so the per-IP rate limiters never interfere.
let ip = 0;
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000", "x-forwarded-for": `10.0.${Math.floor(ip / 250)}.${ip++ % 250}` }),
}));

import { demoProducts } from "@/lib/catalog/demo-data";
import { DemoPaymentProvider } from "@/lib/payments/demo";
import { PayOSProvider } from "@/lib/payments/payos";
import type { PaymentProvider } from "@/lib/payments/types";
import { MemoryStore } from "@/lib/store/memory";
import type { Order } from "@/lib/store/types";

import { GET as getOrderStatus } from "../api/orders/[publicId]/route";
import { POST as simulateDemoTransfer } from "../api/payments/demo/[publicId]/route";
import { POST as payosWebhook } from "../api/payments/payos/webhook/route";
import { placeOrderAction, quoteShippingAction } from "./actions";

const globals = globalThis as unknown as { __shanvisStore?: MemoryStore; __shanvisPayments?: PaymentProvider | null };

const product = (slug: string) => {
  const p = demoProducts.find((d) => d.slug === slug);
  if (!p) throw new Error(`No demo product ${slug}`);
  return p;
};

const checkout = (items: [slug: string, quantity: number][]) => ({
  customer: { name: "Nguyen Van A", phone: "0912 345 678", email: "" },
  address: { line: "12 Hang Bai", province: "Ha Noi", district: "Hoan Kiem", ward: "Hang Bai", ghnDistrictId: null, ghnWardCode: null },
  note: "",
  items: items.map(([slug, quantity]) => ({ productId: product(slug).id, quantity })),
});

const ctx = (publicId: string) => ({ params: Promise.resolve({ publicId }) });

let store: MemoryStore;

const stockOf = async (slug: string) => (await store.listAllProducts()).find((p) => p.slug === slug)!.stock;

async function placeOrder(items: [string, number][]): Promise<Order> {
  const result = await placeOrderAction(checkout(items));
  if (!result.ok) throw new Error(`placeOrderAction failed: ${result.error}`);
  const order = await store.getOrderByPublicId(result.publicId);
  if (!order) throw new Error("order missing");
  return order;
}

async function status(publicId: string) {
  const res = await getOrderStatus(new Request(`http://localhost/api/orders/${publicId}`), ctx(publicId));
  return { http: res.status, body: await res.json() };
}

beforeEach(() => {
  store = new MemoryStore();
  globals.__shanvisStore = store;
  globals.__shanvisPayments = new DemoPaymentProvider();
  vi.stubEnv("SHIPPING_FLAT_FEE", "50000");
  vi.stubEnv("GHN_TOKEN", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
});

afterEach(() => {
  delete globals.__shanvisStore;
  delete globals.__shanvisPayments;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("checkout -> demo payment -> status (happy path)", () => {
  it("places an order, reserves stock, takes the transfer and reports paid", async () => {
    const body = "sony-a7-iv";
    const lens = "sony-fe-35mm-f1-8";
    const before = [await stockOf(body), await stockOf(lens)];

    const order = await placeOrder([[body, 1], [lens, 1]]);
    expect(order).toMatchObject({ status: "pending_payment", shippingFee: 50_000, shippingProvider: "flat" });
    expect(order.subtotal).toBe(product(body).price + product(lens).price);
    expect(order.total).toBe(order.subtotal + 50_000);
    expect(order.customer.phone).toBe("0912345678");
    expect(order.payment.linkId).toBe(`demo-${order.orderCode}`);
    expect(order.payment.account?.description).toBe(`SV${order.orderCode}`);
    expect([await stockOf(body), await stockOf(lens)]).toEqual([before[0] - 1, before[1] - 1]);

    expect((await status(order.publicId)).body).toMatchObject({ status: "pending_payment", amountPaid: 0, total: order.total });

    const res = await simulateDemoTransfer(new Request("http://localhost", { method: "POST" }), ctx(order.publicId));
    expect(await res.json()).toEqual({ status: "paid" });

    const after = await status(order.publicId);
    expect(after.body).toMatchObject({ status: "paid", amountPaid: order.total });
    expect(after.body.paidAt).toEqual(expect.any(String));
    // Paying does not touch stock again.
    expect([await stockOf(body), await stockOf(lens)]).toEqual([before[0] - 1, before[1] - 1]);
  });

  it("quotes the flat shipping fee with the insurance cap", async () => {
    const result = await quoteShippingAction({
      items: checkout([["sony-a7-iv", 1]]).items,
      address: { ghnDistrictId: null, ghnWardCode: null },
    });
    expect(result).toMatchObject({ ok: true, quote: { provider: "flat", fee: 50_000, insuranceCapped: true, insuranceValue: 5_000_000 } });
  });

  it("returns 404 for malformed or unknown order ids", async () => {
    expect((await status("not-an-id")).http).toBe(404);
    expect((await status("0".repeat(32))).http).toBe(404);
  });
});

describe("checkout guards", () => {
  it("refuses a lens that fits no body in the cart, without reserving stock", async () => {
    const before = await stockOf("canon-rf-50mm-f1-8-stm");
    const result = await placeOrderAction(checkout([["sony-a7-iv", 1], ["canon-rf-50mm-f1-8-stm", 1]]));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/mount/i) });
    expect(await stockOf("canon-rf-50mm-f1-8-stm")).toBe(before);
    expect(await store.listOrders()).toHaveLength(0);
  });

  it("refuses an interchangeable lens with only a fixed-lens body", async () => {
    const result = await placeOrderAction(checkout([["fujifilm-x100vi", 1], ["fujifilm-xf-23mm-f1-4-r-lm-wr", 1]]));
    expect(result.ok).toBe(false);
  });

  it("explains sold-out items and leaves stock untouched", async () => {
    const slug = "sony-fe-24-70mm-f2-8-gm-ii";
    const stock = await stockOf(slug);
    const result = await placeOrderAction(checkout([[slug, stock + 1]]));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/stock/i) });
    expect(await stockOf(slug)).toBe(stock);
  });

  it("validates the form on the server", async () => {
    const bad = { ...checkout([["sony-a7-iv", 1]]), customer: { name: "A", phone: "123", email: "" } };
    expect(await placeOrderAction(bad)).toMatchObject({ ok: false });
  });

  it("disables checkout when no payment provider is available", async () => {
    globals.__shanvisPayments = null;
    expect(await placeOrderAction(checkout([["sony-a7-iv", 1]]))).toMatchObject({ ok: false, error: expect.stringMatching(/not available/) });
    expect(await store.listOrders()).toHaveLength(0);
  });

  it("cancels the order and releases stock when the payment link cannot be created", async () => {
    const failing = new DemoPaymentProvider();
    failing.createLink = async () => {
      throw new Error("PayOS is down");
    };
    globals.__shanvisPayments = failing;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const before = await stockOf("nikon-z6-iii");
    const result = await placeOrderAction(checkout([["nikon-z6-iii", 1]]));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/Nothing was charged/) });
    expect(await stockOf("nikon-z6-iii")).toBe(before);
    expect((await store.listOrders())[0]).toMatchObject({ status: "cancelled" });
  });
});

describe("PayOS webhook failure scenarios", () => {
  const checksumKey = "test-checksum-key";
  const client = new PayOS({ clientId: "test", apiKey: "test", checksumKey, logLevel: "off" });

  /** PayOS provider with a real verifier but no network for payment links. */
  class OfflinePayOSProvider extends PayOSProvider {
    async createLink(order: Order) {
      return {
        linkId: `pl-${order.orderCode}`,
        checkoutUrl: `https://pay.payos.vn/web/pl-${order.orderCode}`,
        qr: "000201...",
        account: { bin: "970422", accountNumber: "0123456789", accountName: "SHANVIS", description: `SV${order.orderCode}` },
      };
    }
  }

  async function signedWebhook(orderCode: number, amount: number, opts: { reference?: string; code?: string } = {}): Promise<Webhook> {
    const code = opts.code ?? "00";
    const data: Webhook["data"] = {
      orderCode,
      amount,
      description: `SV${orderCode}`,
      accountNumber: "0123456789",
      reference: opts.reference ?? `FT${orderCode}${amount}`,
      transactionDateTime: "2026-11-24 10:00:00",
      currency: "VND",
      paymentLinkId: `pl-${orderCode}`,
      code,
      desc: code === "00" ? "success" : "failed",
      counterAccountBankId: "",
      counterAccountBankName: "",
      counterAccountName: "",
      counterAccountNumber: "",
      virtualAccountName: "",
      virtualAccountNumber: "",
    };
    const signature = (await client.crypto.createSignatureFromObj(data, checksumKey))!;
    return { code, desc: data.desc, success: code === "00", data, signature };
  }

  const deliver = async (body: unknown) => {
    const res = await payosWebhook(
      new Request("http://localhost/api/payments/payos/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
    return { http: res.status, body: await res.json() };
  };

  beforeEach(() => {
    globals.__shanvisPayments = new OfflinePayOSProvider(client);
  });

  it("marks the order paid for a valid, signed full transfer", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    expect(await deliver(await signedWebhook(order.orderCode, order.total))).toEqual({ http: 200, body: { ok: true, matched: true } });
    expect((await status(order.publicId)).body).toMatchObject({ status: "paid", amountPaid: order.total, paidAt: "2026-11-24T03:00:00.000Z" });
  });

  it("rejects malformed JSON", async () => {
    expect((await deliver("{not json")).http).toBe(400);
  });

  it("rejects a forged or tampered webhook and leaves the order unpaid", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    const genuine = await signedWebhook(order.orderCode, 10_000);
    const tampered = { ...genuine, data: { ...genuine.data, amount: order.total } };
    expect((await deliver(tampered)).http).toBe(400);

    const otherKey = new PayOS({ clientId: "x", apiKey: "x", checksumKey: "attacker", logLevel: "off" });
    const forged = { ...genuine, data: { ...genuine.data, amount: order.total } };
    forged.signature = (await otherKey.crypto.createSignatureFromObj(forged.data, "attacker"))!;
    expect((await deliver(forged)).http).toBe(400);
    expect((await deliver({ ...genuine, signature: undefined })).http).toBe(400);

    expect((await status(order.publicId)).body).toMatchObject({ status: "pending_payment", amountPaid: 0 });
  });

  it("acknowledges but ignores a failed transfer notification", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    const res = await deliver(await signedWebhook(order.orderCode, order.total, { code: "01" }));
    expect(res).toEqual({ http: 200, body: { ok: true, matched: false } });
    expect((await status(order.publicId)).body).toMatchObject({ status: "pending_payment", amountPaid: 0 });
  });

  it("is idempotent when PayOS retries the same transfer", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    const webhook = await signedWebhook(order.orderCode, order.total, { reference: "FT-RETRY" });
    await deliver(webhook);
    await deliver(webhook);
    await deliver(webhook);
    expect((await status(order.publicId)).body).toMatchObject({ status: "paid", amountPaid: order.total });
    expect((await store.getOrderByPublicId(order.publicId))!.needsAttention).toBeNull();
  });

  it("keeps an underpaid order pending and flagged until the rest arrives", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    await deliver(await signedWebhook(order.orderCode, 1_000_000, { reference: "FT-PART1" }));
    expect((await status(order.publicId)).body).toMatchObject({ status: "pending_payment", amountPaid: 1_000_000 });
    expect((await store.getOrderByPublicId(order.publicId))!.needsAttention).toMatch(/Underpaid/);

    await deliver(await signedWebhook(order.orderCode, order.total - 1_000_000, { reference: "FT-PART2" }));
    expect((await status(order.publicId)).body).toMatchObject({ status: "paid", amountPaid: order.total });
    expect((await store.getOrderByPublicId(order.publicId))!.needsAttention).toBeNull();
  });

  it("flags an overpayment for the admin", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    await deliver(await signedWebhook(order.orderCode, order.total + 20_000));
    const updated = await store.getOrderByPublicId(order.publicId);
    expect(updated).toMatchObject({ status: "paid" });
    expect(updated!.needsAttention).toMatch(/Overpaid by 20000 VND/);
  });

  it("acknowledges PayOS's test notification for an unknown order code", async () => {
    expect(await deliver(await signedWebhook(123, 3000))).toEqual({ http: 200, body: { ok: true, matched: false } });
  });

  it("expires an unpaid order, releases stock, and still accepts a late payment", async () => {
    const slug = "canon-eos-r6-mark-ii";
    const before = await stockOf(slug);
    const order = await placeOrder([[slug, 1]]);
    expect(await stockOf(slug)).toBe(before - 1);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await status(order.publicId)).body).toMatchObject({ status: "expired" });
    expect(await stockOf(slug)).toBe(before);

    await deliver(await signedWebhook(order.orderCode, order.total, { reference: "FT-LATE" }));
    expect((await status(order.publicId)).body).toMatchObject({ status: "paid" });
    expect(await stockOf(slug)).toBe(before - 1);
  });

  it("is not reachable when PayOS is not the active provider", async () => {
    globals.__shanvisPayments = new DemoPaymentProvider();
    expect((await deliver({})).http).toBe(404);
  });

  it("refuses demo transfers for PayOS orders", async () => {
    const order = await placeOrder([["canon-eos-r6-mark-ii", 1]]);
    globals.__shanvisPayments = new DemoPaymentProvider();
    const res = await simulateDemoTransfer(new Request("http://localhost", { method: "POST" }), ctx(order.publicId));
    expect(res.status).toBe(404);
    expect((await status(order.publicId)).body).toMatchObject({ status: "pending_payment" });
  });
});
