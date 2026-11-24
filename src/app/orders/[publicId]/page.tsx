import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckCircle2, Clock, PackageCheck, Truck, XCircle } from "lucide-react";

import { getStore, type Order } from "@/lib/store";
import { formatVnd } from "@/lib/utils";
import { Container } from "@/components/layout/container";
import { PaymentStatusWatcher } from "@/components/orders/payment-status";
import { QrCodeSvg } from "@/components/orders/qr-code";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default function OrderPage({ params, searchParams }: PageProps<"/orders/[publicId]">) {
  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
        <OrderDetails params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function OrderDetails({ params, searchParams }: Pick<PageProps<"/orders/[publicId]">, "params" | "searchParams">) {
  await connection(); // live order state: always render per request
  const { publicId } = await params;
  if (!/^[0-9a-f]{32}$/.test(publicId)) notFound();
  const cancelledAtCheckout = (await searchParams).cancelled === "1";

  const store = getStore();
  await store.expireStaleOrders();
  const order = await store.getOrderByPublicId(publicId);
  if (!order) notFound();

  return (
    <div className="space-y-8">
      <StatusHeader order={order} />
      {order.status === "pending_payment" && <PaymentPanel order={order} cancelledAtCheckout={cancelledAtCheckout} />}
      <OrderSummary order={order} />
    </div>
  );
}

const STATUS = {
  pending_payment: { icon: Clock, title: "Scan to pay", tone: "text-primary" },
  paid: { icon: CheckCircle2, title: "Payment received — thank you!", tone: "text-success" },
  shipped: { icon: Truck, title: "On its way", tone: "text-success" },
  completed: { icon: PackageCheck, title: "Delivered", tone: "text-success" },
  cancelled: { icon: XCircle, title: "Order cancelled", tone: "text-destructive" },
  expired: { icon: XCircle, title: "Payment window expired", tone: "text-destructive" },
} as const;

function StatusHeader({ order }: { order: Order }) {
  const s = STATUS[order.status];
  const Icon = s.icon;
  return (
    <header>
      <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Order #{order.orderCode}</p>
      <h1 className={`mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl ${s.tone}`}>
        <Icon className="size-8 shrink-0" /> {s.title}
      </h1>
      {order.status === "paid" && (
        <p className="mt-3 text-muted-foreground">
          We received {formatVnd(order.payment.amountPaid)}. We&apos;ll pack your gear and send tracking details to {order.customer.phone}.
        </p>
      )}
      {order.status === "shipped" && order.trackingCode && (
        <p className="mt-3 text-muted-foreground">
          Tracking code: <span className="spec-figure text-foreground">{order.trackingCode}</span>
        </p>
      )}
      {order.status === "expired" && (
        <p className="mt-3 text-muted-foreground">
          We didn&apos;t receive the transfer in time, so the items went back on sale. If you already paid, contact us with order #{order.orderCode} and we&apos;ll sort it out.
        </p>
      )}
      {(order.status === "expired" || order.status === "cancelled") && (
        <Button className="mt-5" variant="secondary" asChild>
          <Link href="/products">Back to the catalog</Link>
        </Button>
      )}
    </header>
  );
}

function PaymentPanel({ order, cancelledAtCheckout }: { order: Order; cancelledAtCheckout: boolean }) {
  const { qr, account } = order.payment;
  const demo = order.payment.provider === "demo";
  const remaining = order.total - order.payment.amountPaid;

  return (
    <section className="grid gap-8 rounded-3xl border border-border bg-card p-6 sm:p-8 md:grid-cols-[16rem_1fr]">
      <div className="space-y-3">
        {qr ? (
          <QrCodeSvg value={qr} label={`VietQR code for order ${order.orderCode}`} className="w-full rounded-2xl" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">QR unavailable</div>
        )}
        {demo && <p className="text-center text-xs text-warning">Demo QR — not a real bank account.</p>}
      </div>

      <div className="space-y-5">
        {cancelledAtCheckout && (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            You left the payment page. Your items are still reserved until the timer runs out.
          </p>
        )}
        {order.payment.amountPaid > 0 && (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            We received {formatVnd(order.payment.amountPaid)}. Please transfer the remaining {formatVnd(remaining)}.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Open your banking app, scan the code and confirm. Keep the amount and transfer note exactly as shown.
        </p>
        {account && (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="spec-figure text-lg font-semibold">{formatVnd(remaining)}</dd>
            <dt className="text-muted-foreground">Account</dt>
            <dd className="spec-figure">{account.accountNumber}</dd>
            <dt className="text-muted-foreground">Name</dt>
            <dd>{account.accountName}</dd>
            <dt className="text-muted-foreground">Transfer note</dt>
            <dd className="spec-figure font-semibold text-primary">{account.description}</dd>
          </dl>
        )}
        {order.payment.checkoutUrl && (
          <Button variant="outline" asChild>
            <a href={order.payment.checkoutUrl} rel="noopener noreferrer">
              Open PayOS payment page
            </a>
          </Button>
        )}
        <PaymentStatusWatcher publicId={order.publicId} expiresAt={order.payment.expiresAt} demo={demo} />
      </div>
    </section>
  );
}

function OrderSummary({ order }: { order: Order }) {
  return (
    <section className="grid gap-6 rounded-3xl border border-border p-6 sm:p-8 md:grid-cols-2">
      <div>
        <h2 className="mb-3 font-semibold">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3">
              <Link href={`/products/${i.slug}`} className="hover:text-primary">
                {i.name} <span className="spec-figure text-muted-foreground">× {i.quantity}</span>
              </Link>
              <span className="spec-figure shrink-0">{formatVnd(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="spec-figure">{formatVnd(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping ({order.shippingProvider === "ghn" ? "GHN" : "standard"})</dt>
            <dd className="spec-figure">{formatVnd(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd className="spec-figure">{formatVnd(order.total)}</dd>
          </div>
        </dl>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">Delivery</h2>
        <address className="space-y-1 text-sm not-italic text-muted-foreground">
          <p className="text-foreground">{order.customer.name}</p>
          <p>{order.customer.phone}</p>
          <p>{order.address.line}</p>
          <p>
            {order.address.ward}, {order.address.district}, {order.address.province}
          </p>
        </address>
        <p className="mt-4 text-xs text-muted-foreground">
          Declared value for carrier insurance: <span className="spec-figure">{formatVnd(order.insuranceValue)}</span>
        </p>
      </div>
    </section>
  );
}
