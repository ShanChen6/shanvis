import type { Order, PaymentLinkDetails, PaymentProviderId } from "@/lib/store/types";

export interface VerifiedPayment {
  /** False for notifications that are not a successful transfer. */
  success: boolean;
  orderCode: number;
  amount: number;
  reference: string;
  paidAt: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createLink(order: Order, urls: { returnUrl: string; cancelUrl: string }): Promise<PaymentLinkDetails>;
  /** Verify a webhook body's signature. Throws if it is not authentic. */
  verifyWebhook(body: unknown): Promise<VerifiedPayment>;
}

/** Transfer note: PayOS limits it to 9 characters for non-linked bank accounts. */
export function transferNote(orderCode: number) {
  return `SV${orderCode}`.slice(0, 9);
}

/** PayOS sends "YYYY-MM-DD HH:mm:ss" in Vietnam time (UTC+7) without a zone. */
export function parseVietnamDateTime(value: string | undefined | null): string {
  const m = value && /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(value.trim());
  if (!m) return new Date().toISOString();
  return new Date(`${m[1]}T${m[2]}+07:00`).toISOString();
}
