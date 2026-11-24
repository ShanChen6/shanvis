"use client";

import * as React from "react";

import { checkAddition, checkCartCompatibility, type CompatibilityIssue } from "@/lib/cart/compatibility";
import * as store from "@/lib/cart/store";
import type { CartItem, CartProduct } from "@/lib/cart/types";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** All compatibility issues in the current cart. */
  issues: CompatibilityIssue[];
  /** The most recently added product and the issues it caused, if any. */
  lastAdded: { product: CartProduct; issues: CompatibilityIssue[] } | null;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (product: CartProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [isOpen, setIsOpen] = React.useState(false);
  const [lastAdded, setLastAdded] = React.useState<CartContextValue["lastAdded"]>(null);

  const value = React.useMemo<CartContextValue>(() => {
    const issues = checkCartCompatibility(items);
    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      issues,
      lastAdded,
      isOpen,
      setOpen: (open) => {
        setIsOpen(open);
        if (!open) setLastAdded(null);
      },
      add: (product, quantity = 1) => {
        const addIssues = checkAddition(store.getSnapshot(), product);
        store.addItem(product, quantity);
        setLastAdded({ product, issues: addIssues });
        setIsOpen(true);
      },
      setQuantity: store.setQuantity,
      remove: store.removeItem,
      clear: store.clearCart,
    };
  }, [items, isOpen, lastAdded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
