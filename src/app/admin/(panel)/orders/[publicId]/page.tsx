import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getStore } from "@/lib/store";
import { formatVnd } from "@/lib/utils";
import { cancelOrderAction } from "@/app/admin/actions";
import { ShipForm } from "@/components/admin/ship-form";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const fmt = (d: string | null) => (d ? dateFmt.format(new Date(d)) : "—");

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[publicId]">) {
  await requireAdmin();
  const { publicId } = await params;
  const order = await getStore().getOrderByPublicId(publicId);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
            ← All orders
          </Link>
          <h1 className="spec-figure mt-1 text-2xl font-semibold">Order #{order.orderCode}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.needsAttention && (
        <p role="alert" className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {order.needsAttention}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Items</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {order.items.map((i) => (
                <tr key={i.productId}>
                  <td className="py-2">
                    <Link href={`/products/${i.slug}`} className="hover:text-primary">{i.name}</Link>
                  </td>
                  <td className="spec-figure py-2 text-right text-muted-foreground">
                    {i.quantity} × {formatVnd(i.unitPrice)}
                  </td>
                  <td className="spec-figure py-2 text-right">{formatVnd(i.lineTotal)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 text-muted-foreground" colSpan={2}>Shipping ({order.shippingProvider})</td>
                <td className="spec-figure py-2 text-right">{formatVnd(order.shippingFee)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-2" colSpan={2}>Total</td>
                <td className="spec-figure py-2 text-right">{formatVnd(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="mb-1 font-semibold">Customer</h2>
          <p>{order.customer.name}</p>
          <p className="spec-figure">{order.customer.phone}</p>
          {order.customer.email && <p>{order.customer.email}</p>}
          <p className="pt-2 text-muted-foreground">
            {order.address.line}, {order.address.ward}, {order.address.district}, {order.address.province}
          </p>
          {order.note && <p className="rounded-lg bg-muted p-2 text-muted-foreground">“{order.note}”</p>}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Payment & shipping</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Provider</dt>
          <dd className="spec-figure">{order.payment.provider}{order.payment.linkId && ` · ${order.payment.linkId}`}</dd>
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="spec-figure">{formatVnd(order.payment.amountPaid)} / {formatVnd(order.total)}</dd>
          <dt className="text-muted-foreground">Bank reference</dt>
          <dd className="spec-figure">{order.payment.reference ?? "—"}</dd>
          <dt className="text-muted-foreground">Placed / paid</dt>
          <dd>{fmt(order.createdAt)} / {fmt(order.payment.paidAt)}</dd>
          <dt className="text-muted-foreground">Payment window</dt>
          <dd>until {fmt(order.payment.expiresAt)}</dd>
          <dt className="text-muted-foreground">Declared value</dt>
          <dd className="spec-figure">{formatVnd(order.insuranceValue)}</dd>
          <dt className="text-muted-foreground">Tracking</dt>
          <dd className="spec-figure">{order.trackingCode ?? "—"} {order.shippedAt && `(${fmt(order.shippedAt)})`}</dd>
        </dl>

        <div className="mt-5 border-t border-border pt-5">
          {order.status === "paid" && <ShipForm orderId={order.id} />}
          {order.status === "pending_payment" && order.payment.amountPaid === 0 && (
            <form action={cancelOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit" variant="outline">Cancel order and release stock</Button>
            </form>
          )}
          {order.status === "pending_payment" && order.payment.amountPaid > 0 && (
            <p className="text-sm text-muted-foreground">Partially paid: refund the customer before cancelling.</p>
          )}
        </div>
      </section>
    </div>
  );
}
