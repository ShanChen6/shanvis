"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { brandLabel } from "@/lib/catalog/filters";
import { formatVnd } from "@/lib/utils";
import { MOUNT_LABELS } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProductMedia } from "@/components/product/product-media";

import { useCart } from "./cart-provider";
import { CompatibilityNotice } from "./compatibility-notice";

export function CartDrawer() {
  const { items, count, subtotal, issues, lastAdded, isOpen, setOpen, setQuantity, remove } = useCart();
  const hasErrors = issues.some((i) => i.level === "error");
  const justAdded =
    lastAdded && lastAdded.products.some((p) => items.some((i) => i.productId === p.productId)) ? lastAdded : null;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>
            Cart <span className="spec-figure text-muted-foreground">({count})</span>
          </SheetTitle>
          {justAdded && (
            <SheetDescription>
              Added{" "}
              <span className="text-foreground">
                {justAdded.products.length === 1 ? justAdded.products[0].name : `${justAdded.products.length} items`}
              </span>
            </SheetDescription>
          )}
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" strokeWidth={1.25} />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button variant="secondary" onClick={() => setOpen(false)} asChild>
              <Link href="/products">Browse the catalog</Link>
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {justAdded && justAdded.issues.length > 0 && (
              <div className="space-y-2 border-b border-border p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Compatibility check
                </p>
                {justAdded.issues.map((issue) => (
                  <CompatibilityNotice key={`${issue.code}:${issue.productId}`} issue={issue} />
                ))}
              </div>
            )}

            <ul className="divide-y divide-border">
              {items.map((item) => {
                const itemIssues = issues.filter((i) => i.productId === item.productId);
                const shownAbove = justAdded?.issues.some((i) => i.productId === item.productId);
                return (
                  <li key={item.productId} className="flex gap-4 p-5">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="shrink-0 self-start overflow-hidden rounded-xl border border-border"
                    >
                      <ProductMedia
                        name={item.name}
                        category={item.category}
                        seed={item.slug}
                        className="size-20"
                        iconClassName="size-7"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="spec-figure text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            {brandLabel(item.brand)}
                          </p>
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={() => setOpen(false)}
                            className="line-clamp-2 text-sm font-medium hover:text-primary"
                          >
                            {item.name}
                          </Link>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-1 size-8 text-muted-foreground"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => remove(item.productId)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {item.mount && (
                        <Badge variant="secondary" className="spec-figure text-[10px]">
                          {MOUNT_LABELS[item.mount]}
                          {item.fixedLens && ` · fixed ${item.fixedLens}`}
                        </Badge>
                      )}
                      {!shownAbove &&
                        itemIssues.map((issue) => <CompatibilityNotice key={issue.code} issue={issue} />)}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Decrease quantity"
                            disabled={item.quantity <= 1}
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="spec-figure w-6 text-center text-sm" aria-live="polite">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Increase quantity"
                            disabled={item.quantity >= item.stock}
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <span className="spec-figure text-sm font-semibold">
                          {formatVnd(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="spec-figure text-lg font-semibold">{formatVnd(subtotal)}</span>
            </div>
            {hasErrors && (
              <p className="text-xs text-destructive">Resolve the mount conflicts above before checkout.</p>
            )}
            <Button size="lg" disabled title="Checkout arrives in week 5">
              Checkout · coming soon
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
