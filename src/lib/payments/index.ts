import "server-only";

import { PayOS } from "@payos/node";

import { getStore } from "@/lib/store";
import type { Order } from "@/lib/store/types";

import { DemoPaymentProvider } from "./demo";
import { PayOSProvider } from "./payos";
import type { PaymentProvider, VerifiedPayment } from "./types";

export { PAYMENT_WINDOW_MS } from "./payos";

const globalForPayments = globalThis as unknown as { __shanvisPayments?: PaymentProvider | null };

export function isPayOSConfigured() {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

/**
 * Demo payments mark orders paid without money, so they are refused in
 * production unless explicitly allowed (e.g. for a staging demo).
 */
export function demoPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true";
}

/** PayOS when configured, demo payments where allowed, otherwise null (checkout disabled). */
export function getPaymentProvider(): PaymentProvider | null {
  if (globalForPayments.__shanvisPayments !== undefined) return globalForPayments.__shanvisPayments;
  let provider: PaymentProvider | null = null;
  if (isPayOSConfigured()) {
    provider = new PayOSProvider(
      new PayOS({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      }),
    );
  } else if (demoPaymentsAllowed()) {
    provider = new DemoPaymentProvider();
  }
  globalForPayments.__shanvisPayments = provider;
  return provider;
}

export function getDemoProvider() {
  const p = getPaymentProvider();
  // Compare by id, not instanceof: the shared instance may come from another
  // server bundle (route handlers and server actions are bundled separately).
  return p?.id === "demo" ? (p as DemoPaymentProvider) : null;
}

/** Apply a verified payment notification to its order. Shared by the PayOS webhook and demo simulation. */
export async function applyVerifiedPayment(provider: PaymentProvider, payment: VerifiedPayment): Promise<Order | null> {
  if (!payment.success || payment.amount <= 0) return null;
  return getStore().recordPayment({
    orderCode: payment.orderCode,
    provider: provider.id,
    reference: payment.reference,
    amount: payment.amount,
    paidAt: payment.paidAt,
  });
}
