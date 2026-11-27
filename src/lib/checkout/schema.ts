import { z } from "zod";

/** Accepts "0912 345 678", "+84912345678", "84912345678" -> "0912345678". */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[\s.()-]/g, "");
  if (/^\+?84\d{9}$/.test(digits)) return `0${digits.replace(/^\+?84/, "")}`;
  return digits;
}

export const cartItemsSchema = z
  .array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) }))
  .min(1, "Your cart is empty.")
  .max(20);

export const addressSchema = z.object({
  line: z.string().trim().min(3, "Enter your street address.").max(200),
  province: z.string().trim().min(1, "Enter your province/city.").max(100),
  district: z.string().trim().min(1, "Enter your district.").max(100),
  ward: z.string().trim().min(1, "Enter your ward.").max(100),
  ghnDistrictId: z.number().int().positive().nullable(),
  ghnWardCode: z.string().max(20).nullable(),
});

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Enter your full name.").max(100),
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(z.string().regex(/^0\d{9}$/, "Enter a 10-digit Vietnamese phone number.")),
    email: z
      .string()
      .trim()
      .max(200)
      .transform((v) => (v === "" ? null : v))
      .pipe(z.email("Enter a valid email.").nullable()),
  }),
  address: addressSchema,
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v)),
  items: cartItemsSchema,
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
