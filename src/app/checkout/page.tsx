import type { Metadata } from "next";

import { demoPaymentsAllowed, getPaymentProvider } from "@/lib/payments";
import { shippingMode } from "@/lib/shipping";
import { isDemoStore } from "@/lib/store";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  const provider = getPaymentProvider();
  const notices = [
    provider?.id === "demo" && "Demo payments: no real money moves. You can simulate the bank transfer on the next page.",
    isDemoStore() && "Demo store: orders are kept in server memory and disappear on restart.",
  ].filter(Boolean);

  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8">
        <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Checkout</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Delivery &amp; payment</h1>
      </header>
      <CheckoutForm
        shippingMode={shippingMode()}
        paymentsEnabled={Boolean(provider) && (provider?.id !== "demo" || demoPaymentsAllowed())}
        demoNotice={notices.length ? notices.join(" ") : null}
      />
    </Container>
  );
}
