"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";

import { checkCartCompatibility } from "@/lib/cart/compatibility";
import { toCartProduct } from "@/lib/cart/types";
import { addressSchema, cartItemsSchema, checkoutSchema, type CheckoutInput } from "@/lib/checkout/schema";
import { CATALOG_TAG, getCatalog } from "@/lib/catalog/source";
import { PAYMENT_WINDOW_MS, getPaymentProvider } from "@/lib/payments";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { linesFromCatalog, quoteShipping, ShippingError, type ShippingQuote } from "@/lib/shipping";
import { getSiteUrl } from "@/lib/site-url";
import { getStore, isStoreError, type StoreError } from "@/lib/store";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const quoteLimit = createRateLimiter({ limit: 60, windowMs: 60_000 });
const orderLimit = createRateLimiter({ limit: 6, windowMs: 60_000 });

export async function quoteShippingAction(input: { items: unknown; address: unknown }): Promise<Result<{ quote: ShippingQuote }>> {
  if (!quoteLimit(clientKey(await headers())).ok) return { ok: false, error: "Too many requests. Please wait a moment." };
  const items = cartItemsSchema.safeParse(input.items);
  const address = addressSchema.pick({ ghnDistrictId: true, ghnWardCode: true }).safeParse(input.address);
  if (!items.success || !address.success) return { ok: false, error: "Invalid cart or address." };
  try {
    const lines = linesFromCatalog(await getCatalog(), items.data);
    return { ok: true, quote: await quoteShipping(lines, address.data) };
  } catch (error) {
    if (error instanceof ShippingError) return { ok: false, error: error.message };
    throw error;
  }
}

const STORE_MESSAGES: Partial<Record<StoreError["code"], string>> = {
  insufficient_stock: "Sorry — one of the items just sold out or there isn't enough stock. Please review your cart.",
  product_unavailable: "One of the items is no longer available. Please review your cart.",
  empty_order: "Your cart is empty.",
};

export async function placeOrderAction(input: CheckoutInput): Promise<Result<{ publicId: string }>> {
  const provider = getPaymentProvider();
  if (!provider) return { ok: false, error: "Online payment is not available right now." };
  if (!orderLimit(clientKey(await headers())).ok) return { ok: false, error: "Too many attempts. Please wait a minute." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const data = parsed.data;

  let lines;
  let quote;
  try {
    lines = linesFromCatalog(await getCatalog(), data.items);
    // Never sell a kit that can't work together.
    const issues = checkCartCompatibility(lines.map((l) => toCartProduct(l.product))).filter((i) => i.level === "error");
    if (issues.length > 0) return { ok: false, error: issues[0].message };
    quote = await quoteShipping(lines, data.address);
  } catch (error) {
    if (error instanceof ShippingError) return { ok: false, error: error.message };
    throw error;
  }

  const store = getStore();
  let order;
  try {
    order = await store.placeOrder({
      customer: data.customer,
      address: data.address,
      note: data.note,
      items: data.items,
      shippingFee: quote.fee,
      shippingProvider: quote.provider,
      insuranceValue: quote.insuranceValue,
      paymentProvider: provider.id,
      paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString(),
    });
  } catch (error) {
    if (isStoreError(error)) return { ok: false, error: STORE_MESSAGES[error.code] ?? "We couldn't place your order." };
    throw error;
  }
  updateTag(CATALOG_TAG); // stock changed

  try {
    const site = await getSiteUrl();
    const url = `${site}/orders/${order.publicId}`;
    const link = await provider.createLink(order, { returnUrl: url, cancelUrl: `${url}?cancelled=1` });
    await store.attachPaymentLink(order.id, link);
  } catch (error) {
    console.error("Payment link failed", error);
    await store.cancelOrder(order.id).catch(() => undefined); // release the reserved stock
    updateTag(CATALOG_TAG);
    return { ok: false, error: "We couldn't start the payment. Nothing was charged — please try again." };
  }

  return { ok: true, publicId: order.publicId };
}
