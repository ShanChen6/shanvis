import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { getProductBySlug } from "@/lib/catalog/source";
import { toCartProduct } from "@/lib/cart/types";
import { formatVnd } from "@/lib/utils";
import { MOUNT_LABELS, SENSOR_LABELS, type BodySpecs } from "@/types/catalog";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ExplodedStory, type StoryChapter } from "@/components/flagship/exploded-story";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

const FLAGSHIP_SLUG = "sony-a7-iv";

export async function generateMetadata(): Promise<Metadata> {
  const product = await getProductBySlug(FLAGSHIP_SLUG);
  return product
    ? { title: `Inside the ${product.name}`, description: `A layer-by-layer look at the ${product.name}.` }
    : {};
}

function chaptersFor(name: string, s: BodySpecs): StoryChapter[] {
  return [
    {
      eyebrow: "Flagship",
      title: `Inside the ${name}`,
      body: "Scroll to take it apart, layer by layer — and see what each part does for your pictures.",
    },
    {
      eyebrow: "Exploded view",
      title: "Five layers, one frame",
      body: "Shell, stabiliser, sensor, image engine and display. Each one shapes the photo before you ever press the shutter.",
    },
    {
      eyebrow: "Sensor",
      title: `${s.megapixels} megapixels, ${SENSOR_LABELS[s.sensor_size].toLowerCase()}`,
      body: "A larger sensor gathers more light per pixel: cleaner shadows, smoother tonal roll-off and shallower depth of field at the same aperture.",
      stats: [
        ["Resolution", `${s.megapixels}MP`],
        ["ISO", `${s.iso_min}-${s.iso_max.toLocaleString("en-US")}`],
      ],
      focus: "sensor",
    },
    {
      eyebrow: "Stabilisation",
      title: s.ibis_stops ? `${s.ibis_stops} stops of in-body stabilisation` : "Lens-based stabilisation",
      body: "The sensor floats on a magnetic platform and moves against your hand shake on five axes, so slower shutter speeds stay sharp — with any lens you mount.",
      stats: s.ibis_stops ? [["IBIS", `${s.ibis_stops} stops`]] : undefined,
      focus: "ibis",
    },
    {
      eyebrow: "Image engine",
      title: `${s.video_max} without breaking a sweat`,
      body: "The processor reads the sensor, runs autofocus tracking and encodes video in real time. Faster readout means less rolling-shutter wobble.",
      stats: [["Video", s.video_max]],
      focus: "board",
    },
    {
      eyebrow: "Assembled",
      title: `${s.weight_g} g, ready to shoot`,
      body: `It all closes up into a weather-resistant body with the ${MOUNT_LABELS[s.mount_type]} — and a whole system of lenses behind it.`,
      stats: [
        ["Weight", `${s.weight_g} g`],
        ["Mount", MOUNT_LABELS[s.mount_type]],
      ],
    },
  ];
}

export default async function FlagshipPage() {
  const product = await getProductBySlug(FLAGSHIP_SLUG);
  if (!product || product.specs?.kind !== "body") notFound();

  return (
    <>
      <Container>
        <ExplodedStory chapters={chaptersFor(product.name, product.specs)} />
      </Container>

      <section className="border-t border-border">
        <Container className="flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {product.name}
            </p>
            <p className="spec-figure mt-2 text-3xl font-semibold">{formatVnd(product.price)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <AddToCartButton product={toCartProduct(product)} />
            <Button size="lg" variant="secondary" asChild>
              <Link href={`/products/${product.slug}`}>
                Full specs <ArrowRight />
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
