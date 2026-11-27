import type { BodySpecs, LensSpecs } from "@/types/catalog";

export function formatFocalLength(specs: Pick<LensSpecs, "focal_min_mm" | "focal_max_mm">) {
  return specs.focal_min_mm === specs.focal_max_mm
    ? `${specs.focal_min_mm}mm`
    : `${specs.focal_min_mm}-${specs.focal_max_mm}mm`;
}

export function formatAperture(f: number) {
  return `f/${Number.isInteger(f) ? f.toFixed(1) : f}`;
}

export function formatIsoRange(specs: Pick<BodySpecs, "iso_min" | "iso_max">) {
  return `ISO ${specs.iso_min}-${specs.iso_max.toLocaleString("en-US")}`;
}
