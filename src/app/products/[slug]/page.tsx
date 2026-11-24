import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck, Truck } from "lucide-react";

import { brandLabel } from "@/lib/catalog/filters";
import { keySpecs, mediaCaption, stockLabel } from "@/lib/catalog/present";
import { compatibleProducts } from "@/lib/catalog/related";
import { getCatalog, getProductBySlug, getSamplePhotos } from "@/lib/catalog/source";
import { toCartProduct } from "@/lib/cart/types";
import { formatVnd } from "@/lib/utils";
import { MOUNT_LABELS, type ProductWithSpecs } from "@/types/catalog";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { ProductMedia } from "@/components/product/product-media";
import { SampleGallery } from "@/components/product/sample-gallery";
import { SpecTable } from "@/components/product/spec-table";
import { Badge } from "@/components/ui/badge";
import { FocusFrame } from "@/components/ui/focus-frame";
import { SpecChip } from "@/components/ui/spec-chip";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${formatVnd(product.price)} at SHANVIS.`,
  };
}

const CATEGORY_LABEL = { body: "Camera bodies", lens: "Lenses", accessory: "Accessories" } as const;

function compatibilityLine(p: ProductWithSpecs) {
  const s = p.specs;
  if (s?.kind === "body") {
    return s.fixed_lens
      ? `Built-in ${s.fixed_lens} lens — no interchangeable lenses.`
      : `Takes ${MOUNT_LABELS[s.mount_type]} lenses.`;
  }
  if (s?.kind === "lens") return `Fits ${MOUNT_LABELS[s.mount_type]} bodies.`;
  if (s?.kind === "accessory" && s.compatible_mounts.length) {
    return `For ${s.compatible_mounts.map((m) => MOUNT_LABELS[m]).join(" / ")} bodies.`;
  }
  return null;
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [photos, catalog] = await Promise.all([getSamplePhotos(product.id), getCatalog()]);
  const related = compatibleProducts(product, catalog);
  const stock = stockLabel(product.stock);
  const fits = compatibilityLine(product);
  const relatedTitle = product.category === "body" ? "Lenses for this body" : "Bodies that fit";

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/products" className="hover:text-foreground">Catalog</Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li>
            <Link href={`/products?category=${product.category}`} className="hover:text-foreground">
              {CATEGORY_LABEL[product.category]}
            </Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li aria-current="page" className="truncate text-foreground">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="relative">
          <ProductMedia
            name={product.name}
            category={product.category}
            image={product.images[0]}
            seed={product.slug}
            caption={mediaCaption(product)}
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="aspect-[4/3] rounded-3xl border border-border"
            iconClassName="size-24"
          />
          <FocusFrame inset={16} size={24} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="spec-figure text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {brandLabel(product.brand)}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
            {product.description && <p className="mt-3 text-muted-foreground">{product.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {keySpecs(product).map(([label, value]) => (
              <SpecChip key={label} label={label} value={value} />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="spec-figure text-3xl font-semibold">{formatVnd(product.price)}</span>
            <Badge variant={stock.variant}>{stock.label}</Badge>
          </div>

          {fits && (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <span className="mr-2 inline-block size-1.5 rounded-full bg-primary align-middle" aria-hidden />
              {fits}
            </p>
          )}

          <AddToCartButton product={toCartProduct(product)} className="w-full sm:w-auto sm:self-start" />

          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Official warranty
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-primary" /> Insured shipping nationwide
            </li>
          </ul>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="specs-heading">
        <h2 id="specs-heading" className="mb-4 text-xl font-bold tracking-tight">Technical specifications</h2>
        <div className="max-w-3xl">
          <SpecTable product={product} />
        </div>
      </section>

      {photos.length > 0 && (
        <section className="mt-16" aria-labelledby="samples-heading">
          <h2 id="samples-heading" className="text-xl font-bold tracking-tight">Sample gallery</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Shot with this gear, with full EXIF.</p>
          <SampleGallery photos={photos} />
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 text-xl font-bold tracking-tight">{relatedTitle}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id} className="flex">
                <ProductCard product={p} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
