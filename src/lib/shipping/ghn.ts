/**
 * Minimal Giao Hàng Nhanh (GHN) client: shipping fee and address master data.
 *
 * Endpoints and fields follow GHN's public API (v2 shipping order, master
 * data). The official docs portal (developer.ghn.vn) could not be fetched
 * automatically during development, so field names were cross-checked
 * against a maintained SDK; verify against a GHN dev account before launch.
 */

export const GHN_HOSTS = {
  production: "https://online-gateway.ghn.vn",
  dev: "https://dev-online-gateway.ghn.vn",
} as const;

export interface GhnConfig {
  token: string;
  shopId: number;
  env: keyof typeof GHN_HOSTS;
  /** Shop's pickup district/ward; GHN falls back to the shop's address when omitted. */
  fromDistrictId?: number;
  fromWardCode?: string;
  fetch?: typeof fetch;
}

export interface GhnFeeRequest {
  toDistrictId: number;
  toWardCode: string;
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceValue: number;
}

export interface GhnFee {
  total: number;
  serviceFee: number;
  insuranceFee: number;
}

export class GhnError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly ghnCode?: number,
  ) {
    super(message);
    this.name = "GhnError";
  }
}

export class GhnClient {
  constructor(private readonly config: GhnConfig) {}

  private async call<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string | number>,
  ): Promise<T> {
    const doFetch = this.config.fetch ?? fetch;
    const url = new URL(`${GHN_HOSTS[this.config.env]}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));
    const res = await doFetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Token: this.config.token,
        ShopId: String(this.config.shopId),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    let json: { code?: number; message?: string; data?: T } | null = null;
    try {
      json = await res.json();
    } catch {
      // fall through
    }
    if (!res.ok || !json || json.code !== 200) {
      throw new GhnError(json?.message || `GHN request failed (${res.status})`, res.status, json?.code);
    }
    return json.data as T;
  }

  async fee(req: GhnFeeRequest): Promise<GhnFee> {
    const data = await this.call<{ total: number; service_fee: number; insurance_fee: number }>(
      "POST",
      "/shiip/public-api/v2/shipping-order/fee",
      {
        service_type_id: 2, // standard e-commerce delivery (< 20 kg)
        from_district_id: this.config.fromDistrictId,
        from_ward_code: this.config.fromWardCode,
        to_district_id: req.toDistrictId,
        to_ward_code: req.toWardCode,
        weight: req.weightG,
        length: req.lengthCm,
        width: req.widthCm,
        height: req.heightCm,
        insurance_value: req.insuranceValue,
      },
    );
    return { total: data.total, serviceFee: data.service_fee, insuranceFee: data.insurance_fee };
  }

  async provinces() {
    const data = await this.call<{ ProvinceID: number; ProvinceName: string }[]>("GET", "/shiip/public-api/master-data/province");
    return data.map((p) => ({ id: p.ProvinceID, name: p.ProvinceName }));
  }

  async districts(provinceId: number) {
    const data = await this.call<{ DistrictID: number; DistrictName: string }[]>(
      "GET",
      "/shiip/public-api/master-data/district",
      undefined,
      { province_id: provinceId },
    );
    return data.map((d) => ({ id: d.DistrictID, name: d.DistrictName }));
  }

  async wards(districtId: number) {
    const data = await this.call<{ WardCode: string; WardName: string }[] | null>(
      "GET",
      "/shiip/public-api/master-data/ward",
      undefined,
      { district_id: districtId },
    );
    return (data ?? []).map((w) => ({ code: w.WardCode, name: w.WardName }));
  }
}
