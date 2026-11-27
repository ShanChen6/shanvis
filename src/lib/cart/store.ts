import type { CartItem, CartProduct } from "./types";

/**
 * Tiny external store for the cart, persisted to localStorage and synced
 * across tabs. Consumed with useSyncExternalStore (see cart-provider).
 */

const STORAGE_KEY = "shanvis.cart.v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => i && typeof i.productId === "string") : [];
  } catch {
    return [];
  }
}

function write(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be full or blocked (private mode); keep the in-memory cart.
  }
  listeners.forEach((l) => l());
}

export function getSnapshot(): CartItem[] {
  if (items === null) items = read();
  return items;
}

export function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      items = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const clampQty = (qty: number, stock: number) => Math.max(1, Math.min(qty, Math.max(stock, 1)));

export function addItem(product: CartProduct, quantity = 1) {
  const current = getSnapshot();
  const existing = current.find((i) => i.productId === product.productId);
  write(
    existing
      ? current.map((i) =>
          i.productId === product.productId
            ? { ...i, ...product, quantity: clampQty(i.quantity + quantity, product.stock) }
            : i,
        )
      : [...current, { ...product, quantity: clampQty(quantity, product.stock) }],
  );
}

export function setQuantity(productId: string, quantity: number) {
  write(getSnapshot().map((i) => (i.productId === productId ? { ...i, quantity: clampQty(quantity, i.stock) } : i)));
}

export function removeItem(productId: string) {
  write(getSnapshot().filter((i) => i.productId !== productId));
}

export function clearCart() {
  write([]);
}
