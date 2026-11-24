import type { Metadata } from "next";
import { Suspense } from "react";

import { getCatalog } from "@/lib/catalog/source";
import { AiVerdict, AiVerdictSkeleton } from "@/components/compare/ai-verdict";
import { ComparePicker } from "@/components/compare/compare-picker";
import { SpecDiffTable } from "@/components/compare/spec-diff-table";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare two cameras or lenses side by side, with an AI summary of the trade-offs in plain words.",
};

export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-primary">AI Spec Comparator</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Which one is right for you?</h1>
        <p className="mt-3 text-muted-foreground">
          Pick two cameras or two lenses. You get the full spec sheet side by side and a plain-words summary of who
          each one suits.
        </p>
      </header>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-3xl bg-card" />}>
        <Comparison searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Comparison({ searchParams }: Pick<PageProps<"/compare">, "searchParams">) {
  const params = await searchParams;
  const catalog = await getCatalog();
  const comparable = catalog.filter((p) => p.category === "body" || p.category === "lens");
  const a = comparable.find((p) => p.slug === first(params.a));
  const b = comparable.find((p) => p.slug === first(params.b));

  let notice: string | null = null;
  if ((params.a || params.b) && (!a || !b)) notice = "Pick two products to compare.";
  else if (a && b && a.slug === b.slug) notice = "Pick two different products.";
  else if (a && b && a.category !== b.category) notice = "Compare a camera with a camera, or a lens with a lens.";
  const ready = a && b && !notice;

  return (
    <div className="space-y-8">
      <ComparePicker products={comparable} a={a?.slug} b={b?.slug} />
      {notice && (
        <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {notice}
        </p>
      )}
      {ready && (
        <>
          <Suspense key={`${a.slug}:${b.slug}`} fallback={<AiVerdictSkeleton />}>
            <AiVerdict a={a} b={b} />
          </Suspense>
          <section aria-labelledby="spec-table">
            <h2 id="spec-table" className="mb-4 text-xl font-bold tracking-tight">
              Spec sheet
            </h2>
            <SpecDiffTable a={a} b={b} />
          </section>
        </>
      )}
    </div>
  );
}
