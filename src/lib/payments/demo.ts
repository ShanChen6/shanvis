import "server-only";

import { randomBytes } from "node:crypto";

import { PayOS, type Webhook } from "@payos/node";

import type { Order } from "@/lib/store/types";

import { toVerifiedPayment } from "./payos";
import { transferNote, type PaymentProvider } from "./types";

/**
 * Demo payments for local development: no money moves. Webhooks are signed
 * with a per-process random checksum key and verified by the real PayOS SDK,
 * so the demo exercises the same verification path as production.
 */
export class DemoPaymentProvider implements PaymentProvider {
  readonly id = "demo" as const;
  private readonly checksumKey = randomBytes(32).toString("hex");
  private readonly client = new PayOS({ clientId: "demo", apiKey: "demo", checksumKey: this.checksumKey, logLevel: "off" });

  async createLink(order: Order) {
    return {
      linkId: `demo-${order.orderCode}`,
      checkoutUrl: null,
      // Not a VietQR payload: scanning it in a bank app does nothing.
      qr: `SHANVIS DEMO - NOT A REAL PAYMENT - order ${order.orderCode} - ${order.total} VND`,
      account: {
        bin: "000000",
        accountNumber: "DEMO-ONLY",
        accountName: "SHANVIS DEMO (no real account)",
        description: transferNote(order.orderCode),
      },
    };
  }

  async verifyWebhook(body: unknown) {
    const webhook = body as Webhook;
    const data = await this.client.webhooks.verify(webhook);
    return toVerifiedPayment(webhook, data);
  }

  /** Build a signed webhook body as PayOS would send it for a full transfer. */
  async simulateTransfer(order: Order): Promise<Webhook> {
    const now = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 19).replace("T", " ");
    const data: Webhook["data"] = {
      orderCode: order.orderCode,
      amount: order.total - order.payment.amountPaid,
      description: transferNote(order.orderCode),
      accountNumber: "DEMO-ONLY",
      reference: `DEMO${Date.now()}`,
      transactionDateTime: now,
      currency: "VND",
      paymentLinkId: order.payment.linkId ?? "",
      code: "00",
      desc: "success",
      counterAccountBankId: "",
      counterAccountBankName: "",
      counterAccountName: "",
      counterAccountNumber: "",
      virtualAccountName: "",
      virtualAccountNumber: "",
    };
    const signature = await this.client.crypto.createSignatureFromObj(data, this.checksumKey);
    return { code: "00", desc: "success", success: true, data, signature: signature! };
  }
}
