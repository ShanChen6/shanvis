import Link from "next/link";
import { ArrowUpRight, Focus, QrCode, ScanLine, Sparkles, Truck } from "lucide-react";

import { siteConfig } from "@/config/site";
import { featuredBody, featuredLens, sampleExif } from "@/data/showcase";
import { formatAperture, formatFocalLength, formatIsoRange } from "@/lib/specs";
import { formatVnd } from "@/lib/utils";
import { MOUNT_LABELS, MOUNT_TYPES, SENSOR_LABELS } from "@/types/catalog";
import { BentoCard, BentoEyebrow, BentoGrid } from "@/components/bento/bento-grid";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FocusFrame } from "@/components/ui/focus-frame";
import { SpecChip } from "@/components/ui/spec-chip";

export default function HomePage() {
  const body = featuredBody.specs;
  const lens = featuredLens.specs;

  return (
    <>
      {/* Hero ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-evf-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
        <Container className="relative py-20 sm:py-28 lg:py-36">
          <FocusFrame inset={0} size={28} className="hidden lg:block" />
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6">
              <span className="size-1.5 animate-focus-blink rounded-full bg-primary" />
              AF-C · Tracking
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              {siteConfig.tagline.split(" ").slice(0, 2).join(" ")}{" "}
              <span className="text-primary">{siteConfig.tagline.split(" ").slice(2).join(" ")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              {siteConfig.description}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/rig-builder">
                  <Sparkles />
                  Build my rig with AI
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/products">Browse the catalog</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Bento ---------------------------------------------------------------- */}
      <Container className="py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <BentoEyebrow>01 — Design system</BentoEyebrow>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Built for the way you shoot</h2>
          </div>
        </div>

        <BentoGrid>
          {/* AI Rig Builder */}
          <BentoCard span="2x2" focusable className="justify-between gap-8">
            <div>
              <BentoEyebrow className="flex items-center gap-2 text-primary">
                <Sparkles className="size-3.5" /> AI Rig Builder
              </BentoEyebrow>
              <h3 className="mt-3 max-w-md text-2xl font-bold tracking-tight sm:text-3xl">
                Describe your shoot. Get a body and lens that actually fit.
              </h3>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Every combo is checked for mount compatibility, stock and budget before it reaches your cart.
              </p>
            </div>
            <div className="space-y-3">
              <p className="rounded-2xl border border-input bg-muted px-4 py-2.5 text-sm">
                <span className="sr-only">Example prompt: </span>
                Compact street + vlog combo under 40 million VND
              </p>
              <div className="flex flex-wrap gap-2">
                <SpecChip label="Body" value="ZV-E10 II" />
                <SpecChip label="Lens" value="18-50mm f/2.8" />
                <SpecChip label="Mount" value="E" />
                <SpecChip label="Total" value={formatVnd(38980000)} />
              </div>
            </div>
          </BentoCard>

          {/* Featured body */}
          <BentoCard span="2x1" focusable className="gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BentoEyebrow>Body · {SENSOR_LABELS[body.sensor_size]}</BentoEyebrow>
                <h3 className="mt-2 text-xl font-semibold">{featuredBody.name}</h3>
              </div>
              <Badge variant="success">In stock</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <SpecChip label="Sensor" value={`${body.megapixels}MP`} />
              <SpecChip label="ISO" value={formatIsoRange(body).replace("ISO ", "")} />
              <SpecChip label="IBIS" value={body.ibis_stops ? `${body.ibis_stops} stops` : "—"} />
              <SpecChip label="Video" value={body.video_max} />
            </div>
            <div className="mt-auto flex items-center justify-between">
              <span className="spec-figure text-lg font-semibold">{formatVnd(featuredBody.price)}</span>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/products/${featuredBody.slug}`}>
                  Details <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </BentoCard>

          {/* Sample photo EXIF */}
          <BentoCard className="justify-end bg-[radial-gradient(120%_80%_at_70%_20%,#2a1a12_0%,#16161a_60%)]">
            <ScanLine className="absolute right-5 top-5 size-5 text-muted-foreground" />
            <BentoEyebrow>Sample gallery · EXIF</BentoEyebrow>
            <dl className="spec-figure mt-3 grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
              {Object.entries(sampleExif).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="sr-only">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </BentoCard>

          {/* Featured lens */}
          <BentoCard focusable className="gap-3">
            <Focus className="size-5 text-primary" />
            <BentoEyebrow>Lens</BentoEyebrow>
            <h3 className="font-semibold leading-snug">{featuredLens.name}</h3>
            <div className="flex flex-wrap gap-2">
              <SpecChip label="FL" value={formatFocalLength(lens)} />
              <SpecChip label="Max" value={formatAperture(lens.aperture_max)} />
            </div>
            <span className="spec-figure mt-auto text-sm">{formatVnd(featuredLens.price)}</span>
          </BentoCard>

          {/* Mounts */}
          <BentoCard span="2x1" className="gap-4">
            <BentoEyebrow>Shop by mount</BentoEyebrow>
            <p className="max-w-sm text-sm text-muted-foreground">
              The smart cart warns you before a lens and body with different mounts end up together.
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              {MOUNT_TYPES.map((m) => (
                <Badge key={m} variant="outline" className="spec-figure">
                  {MOUNT_LABELS[m]}
                </Badge>
              ))}
            </div>
          </BentoCard>

          {/* Payments */}
          <BentoCard className="gap-3">
            <QrCode className="size-5 text-primary" />
            <BentoEyebrow>VietQR</BentoEyebrow>
            <p className="text-sm text-muted-foreground">Bank transfer confirmed automatically in seconds.</p>
          </BentoCard>

          {/* Shipping */}
          <BentoCard className="gap-3">
            <Truck className="size-5 text-primary" />
            <BentoEyebrow>Insured delivery</BentoEyebrow>
            <p className="text-sm text-muted-foreground">GHN / Viettel Post with declared value for high-end gear.</p>
          </BentoCard>
        </BentoGrid>
      </Container>
    </>
  );
}
