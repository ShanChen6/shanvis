import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function OrderNotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="spec-figure text-xs uppercase tracking-[0.18em] text-muted-foreground">Order not found</p>
      <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t find that order</h1>
      <p className="max-w-md text-muted-foreground">Check the link from your confirmation, or contact us with your order number.</p>
      <Button asChild variant="secondary">
        <Link href="/products">Back to the catalog</Link>
      </Button>
    </Container>
  );
}
