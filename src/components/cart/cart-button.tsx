"use client";

import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useCart } from "./cart-provider";

export function CartButton() {
  const { count, setOpen, issues } = useCart();
  const hasError = issues.some((i) => i.level === "error");
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={count ? `Cart, ${count} item${count > 1 ? "s" : ""}` : "Cart, empty"}
      onClick={() => setOpen(true)}
    >
      <ShoppingBag />
      {count > 0 && (
        <span
          className={`spec-figure absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-[18px] ${
            hasError ? "bg-destructive text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </Button>
  );
}
