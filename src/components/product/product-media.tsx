import Image from "next/image";
import { Aperture, Camera, Package } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/types/catalog";

const ICONS = { body: Camera, lens: Aperture, accessory: Package } satisfies Record<ProductCategory, unknown>;

/** Deterministic hue from a string, so each product gets a stable tint. */
function hueOf(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * Product image, or a tinted placeholder with the category icon when the
 * product has no photo yet.
 */
export function ProductMedia({
  name,
  category,
  image,
  seed,
  caption,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className,
  iconClassName,
}: {
  name: string;
  category: ProductCategory;
  image?: string | null;
  seed: string;
  caption?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  if (image) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image src={image} alt={name} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  const Icon = ICONS[category];
  const hue = hueOf(seed);
  return (
    <div
      role="img"
      aria-label={name}
      className={cn("relative flex items-center justify-center overflow-hidden bg-muted", className)}
      style={{
        backgroundImage: `radial-gradient(90% 70% at 30% 20%, hsl(${hue} 35% 18% / 0.9), transparent 70%), radial-gradient(80% 60% at 80% 90%, hsl(${(hue + 40) % 360} 30% 14% / 0.8), transparent 70%)`,
      }}
    >
      <div className="bg-evf-grid absolute inset-0 opacity-50" aria-hidden />
      <Icon className={cn("relative size-12 text-foreground/25", iconClassName)} strokeWidth={1.25} aria-hidden />
      {caption && (
        <span className="spec-figure absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-foreground/40">
          {caption}
        </span>
      )}
    </div>
  );
}
