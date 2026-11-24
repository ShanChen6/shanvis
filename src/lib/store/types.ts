import type { CameraSpecs, ProductCategory, ProductWithSpecs } from "@/types/catalog";

export const ORDER_STATUSES = ["pending_payment", "paid", "shipped", "completed", "cancelled", "expired"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentProviderId = "payos" | "demo";
export type ShippingProviderId = "ghn" | "flat";

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** Bank details shown next to the VietQR code. */
export interface PaymentAccount {
  bin: string;
  accountNumber: string;
  accountName: string;
  /** Transfer note the customer must keep. */
  description: string;
}

export interface Order {
  id: string;
  publicId: string;
  orderCode: number;
  status: OrderStatus;
  customer: { name: string; phone: string; email: string | null };
  address: {
    line: string;
    province: string;
    district: string;
    ward: string;
    ghnDistrictId: number | null;
    ghnWardCode: string | null;
  };
  note: string | null;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingProvider: ShippingProviderId;
  insuranceValue: number;
  payment: {
    provider: PaymentProviderId;
    linkId: string | null;
    checkoutUrl: string | null;
    qr: string | null;
    account: PaymentAccount | null;
    expiresAt: string;
    amountPaid: number;
    reference: string | null;
    paidAt: string | null;
  };
  needsAttention: string | null;
  trackingCode: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderInput {
  customer: Order["customer"];
  address: Order["address"];
  note: string | null;
  items: { productId: string; quantity: number }[];
  shippingFee: number;
  shippingProvider: ShippingProviderId;
  insuranceValue: number;
  paymentProvider: PaymentProviderId;
  paymentExpiresAt: string;
}

export interface PaymentLinkDetails {
  linkId: string;
  checkoutUrl: string | null;
  qr: string;
  account: PaymentAccount;
}

export interface RecordPaymentInput {
  orderCode: number;
  provider: PaymentProviderId;
  reference: string;
  amount: number;
  paidAt: string;
}

export interface NewProductInput {
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  stock: number;
  description: string | null;
  images: string[];
  specs: CameraSpecs;
}

export type StoreErrorCode =
  | "empty_order"
  | "product_unavailable"
  | "insufficient_stock"
  | "cannot_cancel"
  | "has_payments"
  | "not_found"
  | "duplicate_slug"
  | "invalid";

export class StoreError extends Error {
  constructor(
    public readonly code: StoreErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "StoreError";
  }
}

/**
 * Duck-typed check: the shared store instance can be created by a different
 * server bundle than the caller, so `instanceof StoreError` is unreliable.
 */
export function isStoreError(error: unknown): error is StoreError {
  return error instanceof Error && error.name === "StoreError" && typeof (error as StoreError).code === "string";
}

export interface Store {
  readonly mode: "supabase" | "memory";

  /** All products including inactive ones (admin). */
  listAllProducts(): Promise<ProductWithSpecs[]>;
  createProduct(input: NewProductInput): Promise<ProductWithSpecs>;
  updateProduct(id: string, patch: { stock?: number; isActive?: boolean; price?: number }): Promise<void>;
  upsertEmbedding(productId: string, content: string, embedding: number[], model: string): Promise<void>;
  productIdsWithEmbeddings(): Promise<Set<string>>;

  placeOrder(input: PlaceOrderInput): Promise<Order>;
  attachPaymentLink(orderId: string, link: PaymentLinkDetails): Promise<Order>;
  getOrderByPublicId(publicId: string): Promise<Order | null>;
  /** Idempotent per (provider, reference). Returns null for unknown order codes. */
  recordPayment(input: RecordPaymentInput): Promise<Order | null>;
  cancelOrder(orderId: string): Promise<Order>;
  markShipped(orderId: string, trackingCode: string): Promise<Order>;
  expireStaleOrders(now?: Date): Promise<number>;
  listOrders(filter?: { status?: OrderStatus; limit?: number }): Promise<Order[]>;
}
