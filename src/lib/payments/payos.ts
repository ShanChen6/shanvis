import "server-only";

import { PayOS, type Webhook } from "@payos/node";

import type { Order } from "@/lib/store/types";

import { parseVietnamDateTime, transferNote, type PaymentProvider, type VerifiedPayment } from "./types";

/** Payment window for a PayOS link and its reserved stock. */
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export function toVerifiedPayment(webhook: Webhook, data: Webhook["data"]): VerifiedPayment {
  return {
    success: webhook.code === "00" && data.code === "00",
    orderCode: data.orderCode,
    amount: data.amount,
    reference: data.reference,
    paidAt: parseVietnamDateTime(data.transactionDateTime),
  };
}

export class PayOSProvider implements PaymentProvider {
  readonly id = "payos" as const;

  constructor(private readonly client: PayOS) {}

  async createLink(order: Order, { returnUrl, cancelUrl }: { returnUrl: string; cancelUrl: string }) {
    const link = await this.client.paymentRequests.create({
      orderCode: order.orderCode,
      amount: order.total,
      description: transferNote(order.orderCode),
      returnUrl,
      cancelUrl,
      expiredAt: Math.floor(new Date(order.payment.expiresAt).getTime() / 1000),
      buyerName: order.customer.name,
      buyerPhone: order.customer.phone,
      buyerEmail: order.customer.email ?? undefined,
      items: [
        ...order.items.map((i) => ({ name: i.name.slice(0, 100), quantity: i.quantity, price: i.unitPrice })),
        ...(order.shippingFee > 0 ? [{ name: "Shipping", quantity: 1, price: order.shippingFee }] : []),
      ],
    });
    return {
      linkId: link.paymentLinkId,
      checkoutUrl: link.checkoutUrl,
      qr: link.qrCode,
      account: {
        bin: link.bin,
        accountNumber: link.accountNumber,
        accountName: link.accountName,
        description: link.description,
      },
    };
  }

  async verifyWebhook(body: unknown) {
    const webhook = body as Webhook;
    const data = await this.client.webhooks.verify(webhook);
    return toVerifiedPayment(webhook, data);
  }
}
