import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="spec-figure text-xs uppercase tracking-[0.18em] text-muted-foreground">404 · Out of focus</p>
      <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t find that product</h1>
      <p className="text-muted-foreground">It may have been discontinued or the link is wrong.</p>
      <Button asChild variant="secondary">
        <Link href="/products">Browse the catalog</Link>
      </Button>
    </Container>
  );
}
