"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ShoppingBag, Sparkles } from "lucide-react";

import type { RigProposal } from "@/lib/ai/rig";
import { brandLabel } from "@/lib/catalog/filters";
import { cn, formatVnd } from "@/lib/utils";
import { MOUNT_LABELS } from "@/types/catalog";
import { useCart } from "@/components/cart/cart-provider";
import { CompatibilityNotice } from "@/components/cart/compatibility-notice";
import { ProductMedia } from "@/components/product/product-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** A server-validated kit with a one-click "add all to cart". */
export function RigCard({ rig }: { rig: RigProposal }) {
  const { addMany } = useCart();
  const [added, setAdded] = React.useState(false);
  const mount = rig.items.find((i) => i.category === "body")?.mount;
  const budgetRatio = rig.budgetVnd ? Math.min(1, rig.totalVnd / rig.budgetVnd) : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="spec-figure flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-primary">
            <Sparkles className="size-3" /> AI kit
          </p>
          <h3 className="mt-1.5 text-lg font-semibold leading-snug">{rig.title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{rig.rationale}</p>
        </div>
        {mount && (
          <Badge variant="success" className="spec-figure shrink-0">
            <Check /> {MOUNT_LABELS[mount]}
          </Badge>
        )}
      </header>

      <ul className="divide-y divide-border">
        {rig.items.map((item) => (
          <li key={item.productId} className="flex items-center gap-4 px-5 py-3">
            <ProductMedia
              name={item.name}
              category={item.category}
              seed={item.slug}
              className="size-14 shrink-0 rounded-lg border border-border"
              iconClassName="size-5"
            />
            <div className="min-w-0 flex-1">
              <p className="spec-figure text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {brandLabel(item.brand)} · {item.category}
              </p>
              <Link href={`/products/${item.slug}`} className="block truncate text-sm font-medium hover:text-primary">
                {item.name}
              </Link>
            </div>
            <span className="spec-figure shrink-0 text-sm">{formatVnd(item.price)}</span>
          </li>
        ))}
      </ul>

      {rig.warnings.length > 0 && (
        <div className="space-y-2 px-5 pb-1 pt-3">
          {rig.warnings.map((w) => (
            <CompatibilityNotice key={`${w.code}:${w.productId}`} issue={w} />
          ))}
        </div>
      )}

      <footer className="space-y-4 p-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Kit total</span>
            <span className="spec-figure text-xl font-semibold">{formatVnd(rig.totalVnd)}</span>
          </div>
          {budgetRatio !== null && rig.budgetVnd && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-success" style={{ width: `${budgetRatio * 100}%` }} />
              </div>
              <p className="spec-figure mt-1.5 text-xs text-muted-foreground">
                {formatVnd(rig.budgetVnd - rig.totalVnd)} under your {formatVnd(rig.budgetVnd)} budget
              </p>
            </div>
          )}
        </div>
        <Button
          className={cn("w-full", added && "bg-success hover:bg-success/90")}
          onClick={() => {
            addMany(rig.items);
            setAdded(true);
          }}
        >
          {added ? <Check /> : <ShoppingBag />}
          {added ? "Added — add again?" : "Add the whole kit to cart"}
        </Button>
      </footer>
    </article>
  );
}
