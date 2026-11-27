import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Format an integer VND amount, e.g. 52990000 -> "52.990.000 ₫". */
export function formatVnd(amount: number) {
  return vndFormatter.format(amount);
}
