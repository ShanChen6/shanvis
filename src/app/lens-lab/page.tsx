import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ApertureLab, IsoLab } from "@/components/lens-lab/lens-lab";

export const metadata: Metadata = {
  title: "Lens Lab",
  description: "Drag to compare background blur across apertures and noise across ISO settings.",
};

export default function LensLabPage() {
  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-12 max-w-2xl">
        <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lens Lab</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">See the difference before you buy</h1>
        <p className="mt-3 text-muted-foreground">
          Drag the divider to compare. These are illustrations that show the direction and rough size of each effect
          — check the sample galleries on product pages for real photos.
        </p>
      </header>

      <div className="grid gap-16 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="aperture-heading">
          <h2 id="aperture-heading" className="text-xl font-bold tracking-tight">Aperture &amp; background blur</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            A wider aperture (smaller f-number) melts the background into soft bokeh and lets in more light.
          </p>
          <ApertureLab />
          <p className="mt-4 text-sm">
            <Link href="/products?category=lens&aperture=1.4" className="text-primary underline-offset-4 hover:underline">
              Shop f/1.4 lenses
            </Link>
          </p>
        </section>

        <section aria-labelledby="iso-heading">
          <h2 id="iso-heading" className="text-xl font-bold tracking-tight">ISO &amp; noise</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            Raising ISO brightens a dark scene but adds grain and colour noise. Bigger sensors keep it cleaner.
          </p>
          <IsoLab />
          <p className="mt-4 text-sm">
            <Link href="/products?category=body&sensor=full-frame" className="text-primary underline-offset-4 hover:underline">
              Shop full-frame bodies
            </Link>
          </p>
        </section>
      </div>
    </Container>
  );
}
