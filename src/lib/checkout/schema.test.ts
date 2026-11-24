import { describe, expect, it } from "vitest";

import { checkoutSchema, normalizePhone } from "./schema";

const valid = {
  customer: { name: "Nguyễn Văn A", phone: "0912 345 678", email: "" },
  address: { line: "12 Hàng Bài", province: "Hà Nội", district: "Hoàn Kiếm", ward: "Hàng Bài", ghnDistrictId: null, ghnWardCode: null },
  note: "",
  items: [{ productId: "abc", quantity: 1 }],
};

describe("checkoutSchema", () => {
  it("normalises phone numbers and empty optional fields", () => {
    const data = checkoutSchema.parse(valid);
    expect(data.customer.phone).toBe("0912345678");
    expect(data.customer.email).toBeNull();
    expect(data.note).toBeNull();
    expect(normalizePhone("+84 912 345 678")).toBe("0912345678");
  });

  it("rejects bad phones, emails, empty carts and silly quantities", () => {
    const bad = (patch: object) => checkoutSchema.safeParse({ ...valid, ...patch }).success;
    expect(bad({ customer: { ...valid.customer, phone: "12345" } })).toBe(false);
    expect(bad({ customer: { ...valid.customer, email: "nope" } })).toBe(false);
    expect(bad({ items: [] })).toBe(false);
    expect(bad({ items: [{ productId: "abc", quantity: 999 }] })).toBe(false);
    expect(bad({ address: { ...valid.address, line: "" } })).toBe(false);
  });
});
