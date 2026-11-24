import { brandLabel } from "@/lib/catalog/filters";
import { formatAperture, formatFocalLength } from "@/lib/specs";
import { MOUNT_LABELS, SENSOR_LABELS, type ProductWithSpecs } from "@/types/catalog";

/** Short spec highlights for cards: [label, value] pairs. */
export function keySpecs(p: ProductWithSpecs): [string, string][] {
  const s = p.specs;
  if (!s) return [];
  switch (s.kind) {
    case "body":
      return [
        ["Sensor", SENSOR_LABELS[s.sensor_size]],
        ["Res", `${s.megapixels}MP`],
        ["IBIS", s.ibis_stops ? `${s.ibis_stops} st` : "—"],
      ];
    case "lens":
      return [
        ["FL", formatFocalLength(s)],
        ["Max", formatAperture(s.aperture_max)],
        ["Format", SENSOR_LABELS[s.sensor_coverage]],
      ];
    case "accessory":
      return s.compatible_mounts.length
        ? [["Fits", s.compatible_mounts.map((m) => MOUNT_LABELS[m]).join(", ")]]
        : [["Fits", "Universal"]];
  }
}

export function mediaCaption(p: ProductWithSpecs) {
  const s = p.specs;
  if (s?.kind === "lens") return `${formatFocalLength(s)} ${formatAperture(s.aperture_max)}`;
  if (s?.kind === "body") return MOUNT_LABELS[s.mount_type];
  return brandLabel(p.brand);
}

export function stockLabel(stock: number): { label: string; variant: "success" | "warning" | "destructive" } {
  if (stock <= 0) return { label: "Out of stock", variant: "destructive" };
  if (stock <= 3) return { label: `Only ${stock} left`, variant: "warning" };
  return { label: "In stock", variant: "success" };
}

/** EVF-style readout for the focus-pull overlay. */
export function evfReadout(p: ProductWithSpecs): [string, string][] {
  const s = p.specs;
  if (s?.kind === "body") {
    return [
      ["ISO", `${s.iso_min}-${s.iso_max.toLocaleString("en-US")}`],
      ["MP", String(s.megapixels)],
      ["IBIS", s.ibis_stops ? `${s.ibis_stops}` : "—"],
      ["", s.video_max],
    ];
  }
  if (s?.kind === "lens") {
    return [
      ["", formatFocalLength(s)],
      ["", formatAperture(s.aperture_max)],
      ["", `${s.weight_g}g`],
      ["", s.focal_min_mm === s.focal_max_mm ? "PRIME" : "ZOOM"],
    ];
  }
  return [];
}
