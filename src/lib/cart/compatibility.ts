import { MOUNT_LABELS, type SensorSize } from "@/types/catalog";

import type { CartItem, CartProduct } from "./types";

export type IssueLevel = "error" | "warning";

export type IssueCode =
  | "mount-mismatch"
  | "fixed-lens-body"
  | "crop-lens-on-larger-sensor"
  | "accessory-mismatch";

export interface CompatibilityIssue {
  level: IssueLevel;
  code: IssueCode;
  /** The item the issue is about (the lens or accessory). */
  productId: string;
  message: string;
}

/** Physical sensor size rank, smallest first. */
const SENSOR_RANK: Record<SensorSize, number> = {
  "micro-four-thirds": 0,
  "aps-c": 1,
  "full-frame": 2,
  "medium-format": 3,
};

const mountLabel = (m: CartProduct["mount"]) => (m ? MOUNT_LABELS[m] : "unknown mount");

function listNames(items: Pick<CartProduct, "name">[]) {
  return items.map((i) => i.name).join(", ");
}

/**
 * Check every lens and accessory in the cart against the bodies in the cart.
 * Lenses without any body in the cart are fine — the customer may already own one.
 */
export function checkCartCompatibility(items: CartProduct[]): CompatibilityIssue[] {
  const bodies = items.filter((i) => i.category === "body");
  const swappableBodies = bodies.filter((b) => !b.fixedLens);
  const fixedBodies = bodies.filter((b) => b.fixedLens);
  const issues: CompatibilityIssue[] = [];

  for (const lens of items.filter((i) => i.category === "lens")) {
    if (bodies.length === 0) continue;

    if (swappableBodies.length === 0) {
      issues.push({
        level: "error",
        code: "fixed-lens-body",
        productId: lens.productId,
        message: `${listNames(fixedBodies)} has a built-in lens and can't mount ${lens.name}.`,
      });
      continue;
    }

    const fitting = swappableBodies.filter((b) => b.mount === lens.mount);
    if (fitting.length === 0) {
      issues.push({
        level: "error",
        code: "mount-mismatch",
        productId: lens.productId,
        message: `${lens.name} is ${mountLabel(lens.mount)} and won't fit ${listNames(swappableBodies)} (${[
          ...new Set(swappableBodies.map((b) => mountLabel(b.mount))),
        ].join(" / ")}).`,
      });
      continue;
    }

    // Same mount, but the lens covers a smaller format than every fitting body.
    if (
      lens.sensor &&
      fitting.every((b) => b.sensor && SENSOR_RANK[b.sensor] > SENSOR_RANK[lens.sensor!])
    ) {
      issues.push({
        level: "warning",
        code: "crop-lens-on-larger-sensor",
        productId: lens.productId,
        message: `${lens.name} is made for smaller sensors. On ${listNames(fitting)} it works in crop mode, with fewer megapixels.`,
      });
    }
  }

  for (const acc of items.filter((i) => i.category === "accessory")) {
    if (acc.compatibleMounts.length === 0 || bodies.length === 0) continue;
    if (!bodies.some((b) => b.mount && acc.compatibleMounts.includes(b.mount))) {
      issues.push({
        level: "warning",
        code: "accessory-mismatch",
        productId: acc.productId,
        message: `${acc.name} is made for ${acc.compatibleMounts.map((m) => MOUNT_LABELS[m]).join(" / ")} bodies, not ${listNames(bodies)}.`,
      });
    }
  }

  return issues;
}

/** Issues that adding `product` would cause (or that involve it). */
export function checkAddition(items: CartItem[], product: CartProduct): CompatibilityIssue[] {
  const next = items.some((i) => i.productId === product.productId) ? items : [...items, product];
  const issues = checkCartCompatibility(next);
  if (product.category === "body") {
    // A new body can create issues for lenses already in the cart.
    const before = new Set(checkCartCompatibility(items).map((i) => `${i.code}:${i.productId}`));
    return issues.filter((i) => !before.has(`${i.code}:${i.productId}`));
  }
  return issues.filter((i) => i.productId === product.productId);
}
