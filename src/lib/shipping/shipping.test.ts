import { describe, expect, it, vi } from "vitest";

import { demoProducts } from "@/lib/catalog/demo-data";

import { GhnClient, GhnError } from "./ghn";
import { buildParcel, declaredValue } from "./parcel";

const p = (slug: string) => demoProducts.find((x) => x.slug === slug)!;

describe("buildParcel", () => {
  it("adds item weights, padding and the box", () => {
    // a7 IV 658 g + 150 padding + 400 box
    expect(buildParcel([{ product: p("sony-a7-iv"), quantity: 1 }])).toEqual({ weightG: 1208, lengthCm: 30, widthCm: 22, heightCm: 15 });
  });

  it("uses category defaults for accessories without weight and grows the box", () => {
    const parcel = buildParcel([
      { product: p("peak-design-slide-lite"), quantity: 2 },
      { product: p("nikon-z6-iii"), quantity: 2 },
    ]);
    expect(parcel.weightG).toBe(400 + 2 * (300 + 150) + 2 * (760 + 150));
    expect(parcel.lengthCm).toBe(40);
  });
});

describe("declaredValue", () => {
  it("caps the insured value at the carrier maximum", () => {
    expect(declaredValue(3_000_000, 5_000_000)).toEqual({ value: 3_000_000, capped: false });
    expect(declaredValue(52_990_000, 5_000_000)).toEqual({ value: 5_000_000, capped: true });
  });
});

describe("GhnClient", () => {
  const ok = (data: unknown) => new Response(JSON.stringify({ code: 200, message: "Success", data }), { status: 200 });

  it("sends Token/ShopId headers and the fee request GHN expects", async () => {
    const fetchMock = vi.fn(async () => ok({ total: 65_500, service_fee: 40_500, insurance_fee: 25_000 }));
    const client = new GhnClient({ token: "tkn", shopId: 885, env: "dev", fromDistrictId: 1442, fetch: fetchMock as typeof fetch });
    const fee = await client.fee({ toDistrictId: 1452, toWardCode: "21012", weightG: 1208, lengthCm: 30, widthCm: 22, heightCm: 15, insuranceValue: 5_000_000 });

    expect(fee).toEqual({ total: 65_500, serviceFee: 40_500, insuranceFee: 25_000 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Token: "tkn", ShopId: "885" });
    expect(JSON.parse(init.body as string)).toMatchObject({
      service_type_id: 2,
      from_district_id: 1442,
      to_district_id: 1452,
      to_ward_code: "21012",
      weight: 1208,
      insurance_value: 5_000_000,
    });
  });

  it("reads master data with query params", async () => {
    const fetchMock = vi.fn(async () => ok([{ DistrictID: 1452, DistrictName: "Quận 10" }]));
    const client = new GhnClient({ token: "t", shopId: 1, env: "production", fetch: fetchMock as typeof fetch });
    expect(await client.districts(202)).toEqual([{ id: 1452, name: "Quận 10" }]);
    expect(String((fetchMock.mock.calls[0] as unknown as [URL])[0])).toBe(
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/district?province_id=202",
    );
  });

  it("raises GhnError on API errors", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 400, message: "Token invalid" }), { status: 401 }));
    const client = new GhnClient({ token: "bad", shopId: 1, env: "dev", fetch: fetchMock as typeof fetch });
    await expect(client.provinces()).rejects.toEqual(expect.objectContaining({ name: "GhnError", message: "Token invalid", status: 401 }));
    expect(GhnError).toBeDefined();
  });
});
