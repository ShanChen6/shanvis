import { demoProducts } from "@/lib/catalog/demo-data";
import type { ProductWithSpecs } from "@/types/catalog";

import {
  StoreError,
  type NewProductInput,
  type Order,
  type PaymentLinkDetails,
  type PlaceOrderInput,
  type RecordPaymentInput,
  type Store,
} from "./types";

/**
 * In-memory store for demo mode (no Supabase configured). Mirrors the rules of
 * the SQL functions in supabase/migrations/20261124000004_orders.sql.
 * Data lives in this server process only and is lost on restart.
 */
export class MemoryStore implements Store {
  readonly mode = "memory" as const;
  private products: ProductWithSpecs[];
  private orders = new Map<string, Order>();
  private payments = new Map<string, { orderId: string; amount: number }>();
  private embeddings = new Map<string, { content: string; embedding: number[]; model: string }>();
  private nextCode = 100001;

  constructor(seed: ProductWithSpecs[] = demoProducts) {
    this.products = structuredClone(seed);
  }

  /* ------------------------------ catalog ------------------------------- */

  async listAllProducts() {
    return structuredClone(this.products);
  }

  async createProduct(input: NewProductInput) {
    if (this.products.some((p) => p.slug === input.slug)) throw new StoreError("duplicate_slug");
    if (input.specs.kind !== input.category) throw new StoreError("invalid", "specs.kind does not match category");
    const now = new Date().toISOString();
    const product: ProductWithSpecs = {
      ...input,
      id: crypto.randomUUID(),
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    this.products.push(product);
    return structuredClone(product);
  }

  async updateProduct(id: string, patch: { stock?: number; isActive?: boolean; price?: number }) {
    const p = this.products.find((x) => x.id === id);
    if (!p) throw new StoreError("not_found");
    if (patch.stock !== undefined) {
      if (!Number.isInteger(patch.stock) || patch.stock < 0) throw new StoreError("invalid", "stock must be >= 0");
      p.stock = patch.stock;
    }
    if (patch.price !== undefined) {
      if (!Number.isInteger(patch.price) || patch.price < 0) throw new StoreError("invalid", "price must be >= 0");
      p.price = patch.price;
    }
    if (patch.isActive !== undefined) p.is_active = patch.isActive;
    p.updated_at = new Date().toISOString();
  }

  async upsertEmbedding(productId: string, content: string, embedding: number[], model: string) {
    this.embeddings.set(productId, { content, embedding, model });
  }

  async productIdsWithEmbeddings() {
    return new Set(this.embeddings.keys());
  }

  /* ------------------------------- orders ------------------------------- */

  private product(id: string) {
    return this.products.find((p) => p.id === id);
  }

  private reserve(order: Order) {
    if (order.items.some((i) => (this.product(i.productId)?.stock ?? 0) < i.quantity)) return false;
    for (const i of order.items) this.product(i.productId)!.stock -= i.quantity;
    return true;
  }

  private release(order: Order) {
    for (const i of order.items) {
      const p = this.product(i.productId);
      if (p) p.stock += i.quantity;
    }
  }

  private touch(order: Order) {
    order.updatedAt = new Date().toISOString();
    return structuredClone(order);
  }

  async placeOrder(input: PlaceOrderInput) {
    if (input.items.length === 0) throw new StoreError("empty_order");
    const items = input.items.map(({ productId, quantity }) => {
      const p = this.product(productId);
      if (!p || !p.is_active) throw new StoreError("product_unavailable");
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new StoreError("invalid");
      return { productId, slug: p.slug, name: p.name, unitPrice: p.price, quantity, lineTotal: p.price * quantity };
    });
    const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
    const now = new Date().toISOString();
    const order: Order = {
      id: crypto.randomUUID(),
      publicId: crypto.randomUUID().replaceAll("-", ""),
      orderCode: this.nextCode,
      status: "pending_payment",
      customer: input.customer,
      address: input.address,
      note: input.note,
      items,
      subtotal,
      shippingFee: input.shippingFee,
      total: subtotal + input.shippingFee,
      shippingProvider: input.shippingProvider,
      insuranceValue: input.insuranceValue,
      payment: {
        provider: input.paymentProvider,
        linkId: null,
        checkoutUrl: null,
        qr: null,
        account: null,
        expiresAt: input.paymentExpiresAt,
        amountPaid: 0,
        reference: null,
        paidAt: null,
      },
      needsAttention: null,
      trackingCode: null,
      shippedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!this.reserve(order)) throw new StoreError("insufficient_stock");
    this.nextCode++;
    this.orders.set(order.id, order);
    return structuredClone(order);
  }

  async attachPaymentLink(orderId: string, link: PaymentLinkDetails) {
    const o = this.orders.get(orderId);
    if (!o) throw new StoreError("not_found");
    o.payment = { ...o.payment, linkId: link.linkId, checkoutUrl: link.checkoutUrl, qr: link.qr, account: link.account };
    return this.touch(o);
  }

  async getOrderByPublicId(publicId: string) {
    const o = [...this.orders.values()].find((x) => x.publicId === publicId);
    return o ? structuredClone(o) : null;
  }

  async recordPayment({ orderCode, provider, reference, amount, paidAt }: RecordPaymentInput) {
    const o = [...this.orders.values()].find((x) => x.orderCode === orderCode);
    if (!o) return null;
    const key = `${provider}:${reference}`;
    if (this.payments.has(key)) return structuredClone(o);
    this.payments.set(key, { orderId: o.id, amount });

    const paid = [...this.payments.values()].filter((p) => p.orderId === o.id).reduce((n, p) => n + p.amount, 0);

    if (o.status === "paid" || o.status === "shipped" || o.status === "completed") {
      o.payment.amountPaid = paid;
      o.needsAttention = `Received ${paid - o.total} VND more than the order total: refund the difference.`;
      return this.touch(o);
    }
    if (paid < o.total) {
      o.payment.amountPaid = paid;
      o.payment.reference = reference;
      o.needsAttention = `Underpaid: received ${paid} of ${o.total} VND.`;
      return this.touch(o);
    }

    let attention: string | null = null;
    if ((o.status === "expired" || o.status === "cancelled") && !this.reserve(o)) {
      attention = `Paid after the order was ${o.status} and stock is no longer available: refund or restock.`;
    }
    if (paid > o.total) {
      attention = [attention, `Overpaid by ${paid - o.total} VND: refund the difference.`].filter(Boolean).join(" ");
    }
    o.status = "paid";
    o.payment = { ...o.payment, amountPaid: paid, reference, paidAt };
    o.cancelledAt = null;
    o.needsAttention = attention;
    return this.touch(o);
  }

  async cancelOrder(orderId: string) {
    const o = this.orders.get(orderId);
    if (!o) throw new StoreError("not_found");
    if (o.status !== "pending_payment") throw new StoreError("cannot_cancel", `cannot_cancel_${o.status}`);
    if (o.payment.amountPaid > 0) throw new StoreError("has_payments");
    this.release(o);
    o.status = "cancelled";
    o.cancelledAt = new Date().toISOString();
    return this.touch(o);
  }

  async markShipped(orderId: string, trackingCode: string) {
    const o = this.orders.get(orderId);
    if (!o) throw new StoreError("not_found");
    if (o.status !== "paid") throw new StoreError("invalid", "Only paid orders can be shipped");
    o.status = "shipped";
    o.trackingCode = trackingCode;
    o.shippedAt = new Date().toISOString();
    return this.touch(o);
  }

  async expireStaleOrders(now = new Date()) {
    let n = 0;
    for (const o of this.orders.values()) {
      if (o.status === "pending_payment" && new Date(o.payment.expiresAt) < now) {
        this.release(o);
        o.status = "expired";
        this.touch(o);
        n++;
      }
    }
    return n;
  }

  async listOrders(filter: { status?: Order["status"]; limit?: number } = {}) {
    return [...this.orders.values()]
      .filter((o) => !filter.status || o.status === filter.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 100)
      .map((o) => structuredClone(o));
  }
}
