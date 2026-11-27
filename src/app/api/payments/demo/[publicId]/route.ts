import { applyVerifiedPayment, getDemoProvider } from "@/lib/payments";
import { getStore } from "@/lib/store";

/**
 * Demo mode only: simulate the bank transfer for an order. Builds a signed
 * PayOS-style webhook and pushes it through the same verification and
 * recording path as the real webhook.
 */
export async function POST(_request: Request, { params }: RouteContext<"/api/payments/demo/[publicId]">) {
  const provider = getDemoProvider();
  if (!provider) return Response.json({ error: "Demo payments are disabled." }, { status: 404 });

  const { publicId } = await params;
  const order = await getStore().getOrderByPublicId(publicId);
  if (!order || order.payment.provider !== "demo") return Response.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "pending_payment") return Response.json({ status: order.status });

  const webhook = await provider.simulateTransfer(order);
  const updated = await applyVerifiedPayment(provider, await provider.verifyWebhook(webhook));
  return Response.json({ status: updated?.status ?? order.status });
}
