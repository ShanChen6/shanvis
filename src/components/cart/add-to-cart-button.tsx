"use client";

import { ShoppingBag } from "lucide-react";

import type { CartProduct } from "@/lib/cart/types";
import { Button } from "@/components/ui/button";

import { useCart } from "./cart-provider";

export function AddToCartButton({ product, className }: { product: CartProduct; className?: string }) {
  const { add, items } = useCart();
  const inCart = items.find((i) => i.productId === product.productId)?.quantity ?? 0;
  const soldOut = product.stock <= 0;
  const maxed = inCart >= product.stock;

  return (
    <Button size="lg" className={className} disabled={soldOut || maxed} onClick={() => add(product)}>
      <ShoppingBag />
      {soldOut ? "Out of stock" : maxed ? "All stock in cart" : inCart ? `Add another (${inCart} in cart)` : "Add to cart"}
    </Button>
  );
}
