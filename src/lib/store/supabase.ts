import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CameraSpecs, ProductWithSpecs } from "@/types/catalog";

import {
  StoreError,
  type NewProductInput,
  type Order,
  type OrderItem,
  type PaymentLinkDetails,
  type PlaceOrderInput,
  type RecordPaymentInput,
  type Store,
  type StoreErrorCode,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are untyped until `npm run db:types` is wired in */

const ORDER_SELECT = "*, order_items(*)";

function toOrder(row: any): Order {
  const items: OrderItem[] = (row.order_items ?? []).map((i: any) => ({
    productId: i.product_id,
    slug: i.slug,
    name: i.name,
    unitPrice: Number(i.unit_price),
    quantity: i.quantity,
    lineTotal: Number(i.line_total),
  }));
  return {
    id: row.id,
    publicId: row.public_id,
    orderCode: Number(row.order_code),
    status: row.status,
    customer: { name: row.customer_name, phone: row.customer_phone, email: row.customer_email },
    address: {
      line: row.address_line,
      province: row.province_name,
      district: row.district_name,
      ward: row.ward_name,
      ghnDistrictId: row.ghn_district_id,
      ghnWardCode: row.ghn_ward_code,
    },
    note: row.note,
    items,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee),
    total: Number(row.total),
    shippingProvider: row.shipping_provider,
    insuranceValue: Number(row.insurance_value),
    payment: {
      provider: row.payment_provider,
      linkId: row.payment_link_id,
      checkoutUrl: row.payment_checkout_url,
      qr: row.payment_qr,
      account: row.payment_account,
      expiresAt: row.payment_expires_at,
      amountPaid: Number(row.amount_paid),
      reference: row.payment_reference,
      paidAt: row.paid_at,
    },
    needsAttention: row.needs_attention,
    trackingCode: row.tracking_code,
    shippedAt: row.shipped_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const KNOWN_ERRORS: StoreErrorCode[] = ["empty_order", "product_unavailable", "insufficient_stock", "has_payments"];

function fail(error: { message: string; code?: string }): never {
  const known = KNOWN_ERRORS.find((c) => error.message === c);
  if (known) throw new StoreError(known);
  if (error.message.startsWith("cannot_cancel_")) throw new StoreError("cannot_cancel", error.message);
  if (error.code === "23505") throw new StoreError("duplicate_slug", error.message);
  if (error.code === "23514" || error.code === "22P02") throw new StoreError("invalid", error.message);
  throw new Error(`Supabase error: ${error.message}`);
}

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  private async orderById(id: string): Promise<Order> {
    const { data, error } = await this.db.from("orders").select(ORDER_SELECT).eq("id", id).single();
    if (error) fail(error);
    return toOrder(data);
  }

  async listAllProducts(): Promise<ProductWithSpecs[]> {
    const { data, error } = await this.db
      .from("products")
      .select("*, camera_specs(specs)")
      .order("created_at", { ascending: false });
    if (error) fail(error);
    return data.map(({ camera_specs, ...p }: any) => ({
      ...p,
      price: Number(p.price),
      specs: (camera_specs as { specs: CameraSpecs } | null)?.specs ?? null,
    }));
  }

  async createProduct(input: NewProductInput): Promise<ProductWithSpecs> {
    const { data, error } = await this.db.rpc("create_product", { p: input });
    if (error) fail(error);
    return { ...(data as any), price: Number((data as any).price), specs: input.specs };
  }

  async updateProduct(id: string, patch: { stock?: number; isActive?: boolean; price?: number }) {
    const row: Record<string, unknown> = {};
    if (patch.stock !== undefined) row.stock = patch.stock;
    if (patch.price !== undefined) row.price = patch.price;
    if (patch.isActive !== undefined) row.is_active = patch.isActive;
    const { error, count } = await this.db.from("products").update(row, { count: "exact" }).eq("id", id);
    if (error) fail(error);
    if (count === 0) throw new StoreError("not_found");
  }

  async upsertEmbedding(productId: string, content: string, embedding: number[], model: string) {
    const { error } = await this.db
      .from("product_embeddings")
      .upsert({ product_id: productId, content, embedding: JSON.stringify(embedding), model });
    if (error) fail(error);
  }

  async productIdsWithEmbeddings() {
    const { data, error } = await this.db.from("product_embeddings").select("product_id");
    if (error) fail(error);
    return new Set(data.map((r: any) => r.product_id as string));
  }

  async placeOrder(input: PlaceOrderInput) {
    const { data, error } = await this.db.rpc("place_order", {
      p_order: {
        customer_name: input.customer.name,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email,
        address_line: input.address.line,
        province_name: input.address.province,
        district_name: input.address.district,
        ward_name: input.address.ward,
        ghn_district_id: input.address.ghnDistrictId,
        ghn_ward_code: input.address.ghnWardCode,
        note: input.note,
        shipping_fee: input.shippingFee,
        shipping_provider: input.shippingProvider,
        insurance_value: input.insuranceValue,
        payment_provider: input.paymentProvider,
        payment_expires_at: input.paymentExpiresAt,
        items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      },
    });
    if (error) fail(error);
    return this.orderById((data as any).id);
  }

  async attachPaymentLink(orderId: string, link: PaymentLinkDetails) {
    const { error } = await this.db
      .from("orders")
      .update({
        payment_link_id: link.linkId,
        payment_checkout_url: link.checkoutUrl,
        payment_qr: link.qr,
        payment_account: link.account,
      })
      .eq("id", orderId);
    if (error) fail(error);
    return this.orderById(orderId);
  }

  async getOrderByPublicId(publicId: string) {
    const { data, error } = await this.db.from("orders").select(ORDER_SELECT).eq("public_id", publicId).maybeSingle();
    if (error) fail(error);
    return data ? toOrder(data) : null;
  }

  async recordPayment(input: RecordPaymentInput) {
    const { data, error } = await this.db.rpc("record_order_payment", {
      p_order_code: input.orderCode,
      p_provider: input.provider,
      p_reference: input.reference,
      p_amount: input.amount,
      p_paid_at: input.paidAt,
    });
    if (error) fail(error);
    return data && (data as any).id ? this.orderById((data as any).id) : null;
  }

  async cancelOrder(orderId: string) {
    const { error } = await this.db.rpc("cancel_order", { p_order_id: orderId });
    if (error) fail(error);
    return this.orderById(orderId);
  }

  async markShipped(orderId: string, trackingCode: string) {
    const { data, error } = await this.db
      .from("orders")
      .update({ status: "shipped", tracking_code: trackingCode, shipped_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "paid")
      .select("id");
    if (error) fail(error);
    if (!data?.length) throw new StoreError("invalid", "Only paid orders can be shipped");
    return this.orderById(orderId);
  }

  async expireStaleOrders(now = new Date()) {
    const { data, error } = await this.db.rpc("expire_stale_orders", { p_now: now.toISOString() });
    if (error) fail(error);
    return Number(data ?? 0);
  }

  async listOrders(filter: { status?: Order["status"]; limit?: number } = {}) {
    let q = this.db.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(filter.limit ?? 100);
    if (filter.status) q = q.eq("status", filter.status);
    const { data, error } = await q;
    if (error) fail(error);
    return data.map(toOrder);
  }
}
