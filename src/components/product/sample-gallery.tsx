import { formatAperture } from "@/lib/specs";
import type { SamplePhoto } from "@/types/catalog";
import { SpecChip } from "@/components/ui/spec-chip";

import { ProductMedia } from "./product-media";

function shutterLabel(shutter: string) {
  return shutter.includes("/") ? `${shutter}s` : `${shutter}"`;
}

/** Sample photos with their EXIF data as mono spec tags. */
export function SampleGallery({ photos }: { photos: SamplePhoto[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id}>
          <figure className="overflow-hidden rounded-2xl border border-border bg-card">
            <ProductMedia
              name={photo.alt}
              category="body"
              image={photo.image_url}
              seed={photo.id + photo.alt}
              className="aspect-[3/2]"
              iconClassName="size-8"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
            <figcaption className="space-y-3 p-4">
              <p className="text-sm font-medium">{photo.alt}</p>
              <div className="flex flex-wrap gap-1.5" aria-label="EXIF">
                <SpecChip label="Cam" value={photo.exif.camera} />
                <SpecChip label="Lens" value={photo.exif.lens} />
                <SpecChip label="FL" value={`${photo.exif.focal_length_mm}mm`} />
                <SpecChip label="Ap" value={formatAperture(photo.exif.aperture)} />
                <SpecChip label="SS" value={shutterLabel(photo.exif.shutter)} />
                <SpecChip label="ISO" value={photo.exif.iso} />
              </div>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
