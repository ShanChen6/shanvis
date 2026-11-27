import { applyVerifiedPayment, getPaymentProvider } from "@/lib/payments";

/**
 * PayOS payment webhook. Register this URL in my.payos.vn (or via the
 * confirm-webhook API). The body's signature is verified with the checksum
 * key before anything is recorded; replays are harmless (idempotent per
 * bank reference). PayOS only needs a 2xx response.
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (provider?.id !== "payos") {
    return Response.json({ error: "PayOS is not configured." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  let payment;
  try {
    payment = await provider.verifyWebhook(body);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Unknown order codes (e.g. PayOS's test notification) are acknowledged and ignored.
  const order = await applyVerifiedPayment(provider, payment);
  return Response.json({ ok: true, matched: Boolean(order) });
}
