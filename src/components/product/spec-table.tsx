import { brandLabel } from "@/lib/catalog/filters";
import { formatAperture, formatFocalLength } from "@/lib/specs";
import { MOUNT_LABELS, SENSOR_LABELS, type ProductWithSpecs } from "@/types/catalog";

type Row = [label: string, value: string];

const KNOWN_ACCESSORY_KEYS = new Set(["kind", "compatible_mounts"]);

function rowsFor(p: ProductWithSpecs): Row[] {
  const s = p.specs;
  const rows: Row[] = [["Brand", brandLabel(p.brand)]];
  if (!s) return rows;

  switch (s.kind) {
    case "body":
      rows.push(
        ["Mount", s.fixed_lens ? `Fixed lens · ${s.fixed_lens}` : MOUNT_LABELS[s.mount_type]],
        ["Sensor", SENSOR_LABELS[s.sensor_size]],
        ["Resolution", `${s.megapixels} MP`],
        ["ISO range", `${s.iso_min.toLocaleString("en-US")} - ${s.iso_max.toLocaleString("en-US")}`],
        ["In-body stabilisation", s.ibis_stops ? `Yes · up to ${s.ibis_stops} stops` : "No"],
        ["Max video", s.video_max],
        ["Weight", `${s.weight_g} g`],
      );
      break;
    case "lens":
      rows.push(
        ["Mount", MOUNT_LABELS[s.mount_type]],
        ["Format coverage", SENSOR_LABELS[s.sensor_coverage]],
        ["Focal length", formatFocalLength(s)],
        ["Type", s.focal_min_mm === s.focal_max_mm ? "Prime" : "Zoom"],
        ["Max aperture", formatAperture(s.aperture_max)],
        ["Min aperture", formatAperture(s.aperture_min)],
        ["Optical stabilisation", s.ois ? "Yes" : "No"],
        ["Weight", `${s.weight_g} g`],
      );
      break;
    case "accessory":
      rows.push([
        "Compatible with",
        s.compatible_mounts.length ? s.compatible_mounts.map((m) => MOUNT_LABELS[m]).join(", ") : "Universal",
      ]);
      for (const [key, value] of Object.entries(s)) {
        if (KNOWN_ACCESSORY_KEYS.has(key) || value == null) continue;
        rows.push([key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), String(value)]);
      }
      break;
  }
  return rows;
}

export function SpecTable({ product }: { product: ProductWithSpecs }) {
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rowsFor(product).map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-4 px-5 py-3 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="spec-figure">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
