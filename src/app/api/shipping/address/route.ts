import { connection } from "next/server";

import { ghnDistricts, ghnProvinces, ghnWards, shippingMode } from "@/lib/shipping";

/**
 * GHN address master data for the checkout form:
 *   ?            -> provinces
 *   ?province=ID -> districts
 *   ?district=ID -> wards
 */
export async function GET(request: Request) {
  await connection(); // depends on query params: never prerender
  if (shippingMode() !== "ghn") return Response.json({ error: "GHN is not configured." }, { status: 404 });

  const params = new URL(request.url).searchParams;
  const province = Number(params.get("province"));
  const district = Number(params.get("district"));
  try {
    if (params.has("district")) {
      if (!Number.isInteger(district) || district <= 0) return Response.json({ error: "Invalid district." }, { status: 400 });
      return Response.json({ wards: await ghnWards(district) });
    }
    if (params.has("province")) {
      if (!Number.isInteger(province) || province <= 0) return Response.json({ error: "Invalid province." }, { status: 400 });
      return Response.json({ districts: await ghnDistricts(province) });
    }
    return Response.json({ provinces: await ghnProvinces() });
  } catch (error) {
    console.error("GHN master data failed", error);
    return Response.json({ error: "Address lookup is unavailable right now." }, { status: 502 });
  }
}
