import { getStore } from "@/lib/store";

/** Payment status for the order page to poll. Public ids are unguessable. */
export async function GET(_request: Request, { params }: RouteContext<"/api/orders/[publicId]">) {
  const { publicId } = await params;
  if (!/^[0-9a-f]{32}$/.test(publicId)) return Response.json({ error: "Not found." }, { status: 404 });

  const store = getStore();
  await store.expireStaleOrders();
  const order = await store.getOrderByPublicId(publicId);
  if (!order) return Response.json({ error: "Not found." }, { status: 404 });

  return Response.json(
    {
      status: order.status,
      total: order.total,
      amountPaid: order.payment.amountPaid,
      paidAt: order.payment.paidAt,
      expiresAt: order.payment.expiresAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
