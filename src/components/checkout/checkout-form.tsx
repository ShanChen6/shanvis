"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, QrCode, ShieldCheck } from "lucide-react";

import { placeOrderAction, quoteShippingAction } from "@/app/checkout/actions";
import type { ShippingQuote } from "@/lib/shipping";
import { formatVnd } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";
import { CompatibilityNotice } from "@/components/cart/compatibility-notice";
import { Button } from "@/components/ui/button";

import { AddressFields, emptyAddress, Field, fieldClass, type AddressValue } from "./address-fields";

export function CheckoutForm({
  shippingMode,
  paymentsEnabled,
  demoNotice,
}: {
  shippingMode: "ghn" | "flat";
  paymentsEnabled: boolean;
  demoNotice: string | null;
}) {
  const router = useRouter();
  const { items, subtotal, issues, clear } = useCart();
  const [customer, setCustomer] = React.useState({ name: "", phone: "", email: "" });
  const [address, setAddress] = React.useState<AddressValue>(emptyAddress);
  const [note, setNote] = React.useState("");
  const [quote, setQuote] = React.useState<{ key: string; quote: ShippingQuote | null; error: string | null } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [placing, startPlacing] = React.useTransition();

  const cartItems = React.useMemo(() => items.map((i) => ({ productId: i.productId, quantity: i.quantity })), [items]);
  const blocking = issues.filter((i) => i.level === "error");
  const quoteKey = JSON.stringify([cartItems, address.ghnDistrictId, address.ghnWardCode]);
  const needsAddressForQuote = shippingMode === "ghn" && (!address.ghnDistrictId || !address.ghnWardCode);

  React.useEffect(() => {
    if (cartItems.length === 0 || needsAddressForQuote) return;
    let cancelled = false;
    const t = setTimeout(() => {
      quoteShippingAction({
        items: cartItems,
        address: { ghnDistrictId: address.ghnDistrictId, ghnWardCode: address.ghnWardCode },
      }).then((res) => {
        if (!cancelled) setQuote({ key: quoteKey, quote: res.ok ? res.quote : null, error: res.ok ? null : res.error });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [quoteKey, cartItems, address.ghnDistrictId, address.ghnWardCode, needsAddressForQuote]);

  const currentQuote = quote?.key === quoteKey ? quote : null;
  const shipping = currentQuote?.quote ?? null;

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong p-10 text-center">
        <p className="font-medium">Your cart is empty.</p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link href="/products">Browse the catalog</Link>
        </Button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startPlacing(async () => {
      const res = await placeOrderAction({ customer, address, note, items: cartItems });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      clear();
      router.push(`/orders/${res.publicId}`);
    });
  };

  const canSubmit = paymentsEnabled && blocking.length === 0 && shipping !== null && !placing;

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
      <div className="space-y-10">
        {demoNotice && (
          <p className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {demoNotice}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Contact</h2>
          <Field label="Full name" htmlFor="name">
            <input id="name" required autoComplete="name" maxLength={100} className={fieldClass}
              value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone">
              <input id="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" className={fieldClass}
                value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </Field>
            <Field label="Email (optional, for the receipt)" htmlFor="email">
              <input id="email" type="email" autoComplete="email" className={fieldClass}
                value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Delivery address</h2>
          <AddressFields mode={shippingMode} value={address} onChange={setAddress} />
          <Field label="Note for delivery (optional)" htmlFor="note">
            <textarea id="note" rows={2} maxLength={500} className={`${fieldClass} h-auto py-3`}
              value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="line-clamp-2">{i.name}</span>
                <span className="spec-figure text-xs text-muted-foreground">× {i.quantity}</span>
              </span>
              <span className="spec-figure shrink-0">{formatVnd(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>

        {blocking.map((issue) => (
          <CompatibilityNotice key={`${issue.code}:${issue.productId}`} issue={issue} />
        ))}

        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="spec-figure">{formatVnd(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping {shipping?.provider === "ghn" && "(GHN)"}</dt>
            <dd className="spec-figure">
              {shipping ? formatVnd(shipping.fee) : needsAddressForQuote ? "Choose address" : currentQuote?.error ? "—" : <Loader2 className="size-3.5 animate-spin" />}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="spec-figure">{formatVnd(subtotal + (shipping?.fee ?? 0))}</dd>
          </div>
        </dl>

        {currentQuote?.error && <p className="text-xs text-destructive">{currentQuote.error}</p>}

        {shipping && (
          <p className="flex gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Declared value for carrier insurance: <span className="spec-figure text-foreground">{formatVnd(shipping.insuranceValue)}</span>.
              {shipping.insuranceCapped && ` The carrier insures parcels up to ${formatVnd(shipping.insuranceCap)}.`}
            </span>
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
          {placing ? <Loader2 className="animate-spin" /> : <QrCode />}
          {placing ? "Placing order…" : "Pay with VietQR"}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" /> Bank transfer via VietQR · confirmed automatically
        </p>
        {!paymentsEnabled && <p className="text-center text-xs text-destructive">Online payment is not available right now.</p>}
      </aside>
    </form>
  );
}
